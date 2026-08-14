package main

import (
	"encoding/json"
	"flag"
	"strings"
	"time"

	"extension-scaffold/tools/pkg/configs"
	"extension-scaffold/tools/pkg/fccutils"
	"extension-scaffold/tools/pkg/support"
	instrutils "extension-scaffold/tools/pkg/utils"

	"github.com/ethereum/go-ethereum/common"
	"github.com/flare-foundation/go-flare-common/pkg/logger"
	"github.com/pkg/errors"
)

// Expected response shape for the extension's SENTINEL AUTHORIZE_SECRET operation.
//
// These are deliberately declared here rather than imported from the extension:
// this tool asserts on the *wire format*, and must run unchanged against every
// language implementation (see docs/extension-contract.md). Keeping them local
// is what lets tools/ stay independent of any one implementation.

type authorizeSecretResponse struct {
	Authorized      bool   `json:"authorized"`
	AuthorizationId int    `json:"authorizationId"`
	Operation       string `json:"operation"`
	OrgId           string `json:"orgId"`
	SecretName      string `json:"secretName"`
	InstructionId   string `json:"instructionId"`
	PublicKey       string `json:"publicKey"`
	Signature       string `json:"signature"`
}

func main() {
	af := flag.String("a", configs.AddressesFile, "file with deployed addresses")
	cf := flag.String("c", configs.ChainNodeURL, "chain node url")
	pf := flag.String("p", configs.ExtensionProxyURL, "extension proxy url")
	instructionSenderF := flag.String("instructionSender", "", "instructionSender address")
	flag.Parse()

	instructionSenderAddress := common.HexToAddress(*instructionSenderF)

	testSupport, err := support.DefaultSupport(*af, *cf)
	if err != nil {
		fccutils.FatalWithCause(err)
	}

	// --- Generic: configure contract -----------------------------------------
	logger.Infof("Setting extension ID on instruction sender...")
	err = instrutils.SetExtensionId(testSupport, instructionSenderAddress)
	if err != nil {
		if strings.Contains(err.Error(), "already set") || strings.Contains(err.Error(), "Extension ID already set") {
			logger.Infof("Extension ID already set on contract, continuing")
		} else {
			logger.Errorf("setExtensionId failed: %s", err)
			fccutils.FatalWithCause(errors.Errorf(
				"setExtensionId failed — is the extension registered? Check that pre-build.sh completed successfully. Error: %s", err))
		}
	}

	// --- Test case: Send an AUTHORIZE_SECRET instruction ---
	logger.Infof("Sending AUTHORIZE_SECRET instruction...")

	payload, err := json.Marshal(map[string]interface{}{
		"orgId":      "sentinel-test-org",
		"secretName": "test-secret",
		"context": map[string]interface{}{
			"agentId":   "agent-1",
			"sessionId": "session-1",
			"action":    "read",
		},
	})
	if err != nil {
		fccutils.FatalWithCause(err)
	}

	instructionId, _, err := instrutils.SendAuthorizeSecret(testSupport, instructionSenderAddress, payload)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	logger.Infof("Instruction sent. ID: %s", instructionId.Hex())

	time.Sleep(5 * time.Second)

	err = verifySecretResult(*pf, instructionId)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	logger.Infof("Test passed: AUTHORIZE_SECRET instruction processed successfully")

	logger.Infof("All tests passed.")
}

func verifySecretResult(proxyURL string, instructionId common.Hash) error {
	// --- Generic: poll proxy for result (do not modify) ---
	actionResponse, err := fccutils.ActionResult(proxyURL, instructionId)
	if err != nil {
		return err
	}
	actionResult := actionResponse.Result

	if actionResult.Status == 0 {
		return errors.Errorf("instruction processing failed: %s", actionResult.Log)
	}
	if actionResult.Status == 2 {
		return errors.New("instruction still pending after polling, expected completed")
	}

	if len(actionResult.Data) == 0 {
		return errors.New("expected response data but got none")
	}

	var resp authorizeSecretResponse
	err = json.Unmarshal(actionResult.Data, &resp)
	if err != nil {
		return errors.Errorf("failed to unmarshal response: %s", err)
	}

	if !resp.Authorized {
		return errors.New("expected authorized=true")
	}
	if resp.Operation != "AUTHORIZE_SECRET" {
		return errors.Errorf("expected operation AUTHORIZE_SECRET, got %s", resp.Operation)
	}
	if resp.OrgId == "" {
		return errors.New("expected non-empty OrgId")
	}
	if resp.SecretName == "" {
		return errors.New("expected non-empty SecretName")
	}
	if resp.Signature == "" {
		return errors.New("expected non-empty Signature")
	}

	logger.Infof("Response data: %+v", resp)

	return nil
}
