package extension

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"sentinel-fce/internal/config"
	"sentinel-fce/pkg/types"

	"github.com/flare-foundation/go-flare-common/pkg/tee/instruction"
	teetypes "github.com/flare-foundation/tee-node/pkg/types"
	teeutils "github.com/flare-foundation/tee-node/pkg/utils"
	"github.com/flare-foundation/tee-node/pkg/processorutils"
)

type Extension struct {
	mu     sync.RWMutex
	Server *http.Server

	authorizationsCount int
	attestationsCount   int
	dangerousCount      int
	lastAuthorization   string
	lastAttestation     string
	lastDangerous       string
}

func New(extensionPort, signPort int) *Extension {
	e := &Extension{}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /state", e.stateHandler)
	mux.HandleFunc("POST /action", e.actionHandler)

	e.Server = &http.Server{Addr: fmt.Sprintf(":%d", extensionPort), Handler: mux}
	return e
}

func (e *Extension) stateHandler(w http.ResponseWriter, r *http.Request) {
	e.mu.RLock()
	stateResponse := types.StateResponse{
		StateVersion: teeutils.ToHash(config.Version),
		State: types.State{
			AuthorizationsCount: e.authorizationsCount,
			AttestationsCount:   e.attestationsCount,
			DangerousCount:      e.dangerousCount,
			LastAuthorization:   e.lastAuthorization,
			LastAttestation:     e.lastAttestation,
			LastDangerous:       e.lastDangerous,
		},
	}
	e.mu.RUnlock()

	err := json.NewEncoder(w).Encode(stateResponse)
	if err != nil {
		http.Error(w, fmt.Sprintf("sending response: %v", err), http.StatusInternalServerError)
		return
	}
}

func (e *Extension) processAction(action teetypes.Action) (int, []byte) {
	dataFixed, err := processorutils.Parse[instruction.DataFixed](action.Data.Message)
	if err != nil {
		return http.StatusBadRequest, []byte(fmt.Sprintf("decoding fixed data: %v", err))
	}

	switch {
	case dataFixed.OPType == teeutils.ToHash(config.OPTypeSentinel):
		return e.processSentinel(action, dataFixed)

	default:
		return http.StatusNotImplemented, []byte(fmt.Sprintf(
			"unsupported op type: received %s, expected %s (%s)",
			dataFixed.OPType.Hex(), teeutils.ToHash(config.OPTypeSentinel).Hex(), config.OPTypeSentinel,
		))
	}
}

func (e *Extension) processSentinel(action teetypes.Action, df *instruction.DataFixed) (int, []byte) {
	switch {
	case df.OPCommand == teeutils.ToHash(config.OPCommandAuthorizeSecret):
		ar := e.processAuthorizeSecret(action, df)
		b, _ := json.Marshal(ar)
		return http.StatusOK, b

	case df.OPCommand == teeutils.ToHash(config.OPCommandAttestPolicy):
		ar := e.processAttestPolicy(action, df)
		b, _ := json.Marshal(ar)
		return http.StatusOK, b

	case df.OPCommand == teeutils.ToHash(config.OPCommandAuthorizeDangerous):
		ar := e.processAuthorizeDangerous(action, df)
		b, _ := json.Marshal(ar)
		return http.StatusOK, b

	case df.OPCommand == teeutils.ToHash(config.OPCommandGetState):
		ar := e.processGetState(action, df)
		b, _ := json.Marshal(ar)
		return http.StatusOK, b

	default:
		return http.StatusNotImplemented, []byte(fmt.Sprintf(
			"unsupported op command: received %s, expected one of [%s (%s), %s (%s), %s (%s), %s (%s)]",
			df.OPCommand.Hex(),
			teeutils.ToHash(config.OPCommandAuthorizeSecret).Hex(), config.OPCommandAuthorizeSecret,
			teeutils.ToHash(config.OPCommandAttestPolicy).Hex(), config.OPCommandAttestPolicy,
			teeutils.ToHash(config.OPCommandAuthorizeDangerous).Hex(), config.OPCommandAuthorizeDangerous,
			teeutils.ToHash(config.OPCommandGetState).Hex(), config.OPCommandGetState,
		))
	}
}

func (e *Extension) processAuthorizeSecret(action teetypes.Action, df *instruction.DataFixed) teetypes.ActionResult {
	var req types.AuthorizeSecretRequest
	dec := json.NewDecoder(bytes.NewReader(df.OriginalMessage))
	dec.DisallowUnknownFields()
	err := dec.Decode(&req)
	if err != nil {
		return buildResult(action, df, nil, 0, fmt.Errorf("decoding request: %w", err))
	}

	if req.OrgId == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("orgId must not be empty"))
	}
	if req.SecretName == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("secretName must not be empty"))
	}

	e.mu.Lock()
	e.authorizationsCount++
	authId := e.authorizationsCount
	now := time.Now().Unix()
	record := fmt.Sprintf("auth:%s:%s:%d", req.OrgId, req.SecretName, authId)
	e.lastAuthorization = record
	e.mu.Unlock()

	resp, err := signedAuthorizeSecret(action.Data.ID.Hex(), req.OrgId, req.SecretName, authId, now)
	if err != nil {
		return buildResult(action, df, nil, 0, fmt.Errorf("signing failed: %w", err))
	}
	data, _ := json.Marshal(resp)
	return buildResult(action, df, data, 1, nil)
}

func (e *Extension) processAttestPolicy(action teetypes.Action, df *instruction.DataFixed) teetypes.ActionResult {
	var req types.AttestPolicyRequest
	dec := json.NewDecoder(bytes.NewReader(df.OriginalMessage))
	dec.DisallowUnknownFields()
	err := dec.Decode(&req)
	if err != nil {
		return buildResult(action, df, nil, 0, fmt.Errorf("decoding request: %w", err))
	}

	if req.PolicyHash == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("policyHash must not be empty"))
	}
	if req.PolicyId == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("policyId must not be empty"))
	}

	e.mu.Lock()
	e.attestationsCount++
	attId := e.attestationsCount
	now := time.Now().Unix()
	record := fmt.Sprintf("attest:%s:%s:%d", req.OrgId, req.PolicyId, attId)
	e.lastAttestation = record
	e.mu.Unlock()

	resp, err := signedAttestPolicy(action.Data.ID.Hex(), req.OrgId, req.PolicyId, req.Version, req.PolicyHash, attId, now)
	if err != nil {
		return buildResult(action, df, nil, 0, fmt.Errorf("signing failed: %w", err))
	}
	data, _ := json.Marshal(resp)
	return buildResult(action, df, data, 1, nil)
}

func (e *Extension) processAuthorizeDangerous(action teetypes.Action, df *instruction.DataFixed) teetypes.ActionResult {
	var req types.AuthorizeDangerousRequest
	dec := json.NewDecoder(bytes.NewReader(df.OriginalMessage))
	dec.DisallowUnknownFields()
	err := dec.Decode(&req)
	if err != nil {
		return buildResult(action, df, nil, 0, fmt.Errorf("decoding request: %w", err))
	}

	if req.OperationId == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("operationId must not be empty"))
	}
	if req.OperationType == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("operationType must not be empty"))
	}
	if req.Resource == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("resource must not be empty"))
	}
	if req.RequestHash == "" {
		return buildResult(action, df, nil, 0, fmt.Errorf("requestHash must not be empty"))
	}

	e.mu.Lock()
	e.dangerousCount++
	authId := e.dangerousCount
	now := time.Now().Unix()
	record := fmt.Sprintf("dangerous:%s:%s:%d", req.OrgId, req.OperationType, authId)
	e.lastDangerous = record
	e.mu.Unlock()

	resp, err := signedAuthorizeDangerous(action.Data.ID.Hex(), req.OrgId, req.OperationId, req.OperationType, req.Resource, req.RequestHash, authId, now)
	if err != nil {
		return buildResult(action, df, nil, 0, fmt.Errorf("signing failed: %w", err))
	}
	data, _ := json.Marshal(resp)
	return buildResult(action, df, data, 1, nil)
}

func (e *Extension) processGetState(action teetypes.Action, df *instruction.DataFixed) teetypes.ActionResult {
	e.mu.RLock()
	state := types.State{
		AuthorizationsCount: e.authorizationsCount,
		AttestationsCount:   e.attestationsCount,
		DangerousCount:      e.dangerousCount,
		LastAuthorization:   e.lastAuthorization,
		LastAttestation:     e.lastAttestation,
		LastDangerous:       e.lastDangerous,
	}
	e.mu.RUnlock()

	data, _ := json.Marshal(state)
	return buildResult(action, df, data, 1, nil)
}
