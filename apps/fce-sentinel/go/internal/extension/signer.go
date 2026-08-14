package extension

import (
	"bytes"
	"crypto"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/hex"
	"fmt"
	"strconv"
	"sync"

	"sentinel-fce/pkg/types"
)

var (
	once         sync.Once
	signingKey   ed25519.PrivateKey
	verifyingKey ed25519.PublicKey
)

func initSigningKey() {
	once.Do(func() {
		var err error
		verifyingKey, signingKey, err = ed25519.GenerateKey(rand.Reader)
		if err != nil {
			panic(fmt.Sprintf("TEE signing key generation: %v", err))
		}
	})
}

func signedAttestPolicy(actionID, orgId, policyId string, policyVersion int, policyHash string, authId int, now int64) (types.SignedAttestationResponse, error) {
	initSigningKey()

	spki, err := x509.MarshalPKIXPublicKey(verifyingKey)
	if err != nil {
		return types.SignedAttestationResponse{}, fmt.Errorf("SPKI marshaling failed: %w", err)
	}

	resp := types.SignedAttestationResponse{
		Authorized:      true,
		InstructionId:   actionID,
		AuthorizationId: authId,
		Timestamp:       now,
		OrganizationId:  orgId,
		PolicyId:        policyId,
		PolicyVersion:   policyVersion,
		PolicyHash:      policyHash,
		Operation:       "ATTEST_POLICY",
		PublicKey:       hex.EncodeToString(spki),
	}

	msg := canonicalMessage(resp.InstructionId, resp.OrganizationId, resp.PolicyId,
		strconv.Itoa(resp.PolicyVersion), resp.PolicyHash,
		strconv.Itoa(resp.AuthorizationId), strconv.FormatInt(resp.Timestamp, 10), resp.Operation)

	sig, err := signingKey.Sign(rand.Reader, msg, crypto.Hash(0))
	if err != nil {
		return types.SignedAttestationResponse{}, fmt.Errorf("signing failed: %w", err)
	}
	resp.Signature = hex.EncodeToString(sig)
	return resp, nil
}

func signedAuthorizeDangerous(actionID, orgId, operationId, operationType, resource, requestHash string, authId int, now int64) (types.SignedDangerousResponse, error) {
	initSigningKey()

	spki, err := x509.MarshalPKIXPublicKey(verifyingKey)
	if err != nil {
		return types.SignedDangerousResponse{}, fmt.Errorf("SPKI marshaling failed: %w", err)
	}

	resp := types.SignedDangerousResponse{
		Authorized:      true,
		InstructionId:   actionID,
		AuthorizationId: authId,
		Timestamp:       now,
		OrganizationId:  orgId,
		OperationId:     operationId,
		OperationType:   operationType,
		Resource:        resource,
		RequestHash:     requestHash,
		Operation:       "AUTHORIZE_DANGEROUS",
		PublicKey:       hex.EncodeToString(spki),
	}

	msg := canonicalMessage(resp.InstructionId, resp.OrganizationId, resp.OperationId,
		resp.OperationType, resp.Resource, resp.RequestHash,
		strconv.Itoa(resp.AuthorizationId), strconv.FormatInt(resp.Timestamp, 10), resp.Operation)

	sig, err := signingKey.Sign(rand.Reader, msg, crypto.Hash(0))
	if err != nil {
		return types.SignedDangerousResponse{}, fmt.Errorf("signing failed: %w", err)
	}
	resp.Signature = hex.EncodeToString(sig)
	return resp, nil
}

func signedAuthorizeSecret(actionID, orgId, secretName string, authId int, now int64) (types.SignedResponse, error) {
	initSigningKey()

	spki, err := x509.MarshalPKIXPublicKey(verifyingKey)
	if err != nil {
		return types.SignedResponse{}, fmt.Errorf("SPKI marshaling failed: %w", err)
	}

	resp := types.SignedResponse{
		Authorized:      true,
		AuthorizationId: authId,
		Timestamp:       now,
		Operation:       "AUTHORIZE_SECRET",
		OrgId:           orgId,
		SecretName:      secretName,
		InstructionId:   actionID,
		PublicKey:       hex.EncodeToString(spki),
	}

	msg := canonicalMessage(resp.InstructionId, resp.OrgId, resp.SecretName,
		strconv.Itoa(resp.AuthorizationId), strconv.FormatInt(resp.Timestamp, 10), resp.Operation)

	sig, err := signingKey.Sign(rand.Reader, msg, crypto.Hash(0))
	if err != nil {
		return types.SignedResponse{}, fmt.Errorf("signing failed: %w", err)
	}
	resp.Signature = hex.EncodeToString(sig)
	return resp, nil
}

func canonicalMessage(parts ...string) []byte {
	var buf bytes.Buffer
	for _, p := range parts {
		buf.WriteString(p)
		buf.WriteByte(0)
	}
	return buf.Bytes()
}
