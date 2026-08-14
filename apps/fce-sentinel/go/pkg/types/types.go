package types

import "github.com/ethereum/go-ethereum/common"

type AuthorizeSecretRequest struct {
	OrgId      string         `json:"orgId"`
	SecretName string         `json:"secretName"`
	Context    RequestContext `json:"context"`
}

type RequestContext struct {
	AgentId   string `json:"agentId"`
	SessionId string `json:"sessionId"`
	Action    string `json:"action"`
}

type SignedResponse struct {
	Authorized      bool   `json:"authorized"`
	AuthorizationId int    `json:"authorizationId"`
	Timestamp       int64  `json:"timestamp"`
	Operation       string `json:"operation"`
	OrgId           string `json:"orgId"`
	SecretName      string `json:"secretName"`
	InstructionId   string `json:"instructionId"`
	Signature       string `json:"signature"`
	PublicKey       string `json:"publicKey"`
}

type AttestPolicyRequest struct {
	OrgId      string `json:"orgId"`
	PolicyId   string `json:"policyId"`
	PolicyHash string `json:"policyHash"`
	Version    int    `json:"version"`
}

type SignedAttestationResponse struct {
	Authorized      bool   `json:"authorized"`
	InstructionId   string `json:"instructionId"`
	AuthorizationId int    `json:"authorizationId"`
	Timestamp       int64  `json:"timestamp"`
	OrganizationId  string `json:"organizationId"`
	PolicyId        string `json:"policyId"`
	PolicyVersion   int    `json:"policyVersion"`
	PolicyHash      string `json:"policyHash"`
	Operation       string `json:"operation"`
	PublicKey       string `json:"publicKey"`
	Signature       string `json:"signature"`
}

type AuthorizeDangerousRequest struct {
	OrgId         string `json:"orgId"`
	OperationId   string `json:"operationId"`
	OperationType string `json:"operationType"`
	Resource      string `json:"resource"`
	RequestHash   string `json:"requestHash"`
}

type SignedDangerousResponse struct {
	Authorized      bool   `json:"authorized"`
	InstructionId   string `json:"instructionId"`
	AuthorizationId int    `json:"authorizationId"`
	Timestamp       int64  `json:"timestamp"`
	OrganizationId  string `json:"organizationId"`
	OperationId     string `json:"operationId"`
	OperationType   string `json:"operationType"`
	Resource        string `json:"resource"`
	RequestHash     string `json:"requestHash"`
	Operation       string `json:"operation"`
	PublicKey       string `json:"publicKey"`
	Signature       string `json:"signature"`
}

type State struct {
	AuthorizationsCount int    `json:"authorizationsCount"`
	AttestationsCount   int    `json:"attestationsCount"`
	DangerousCount      int    `json:"dangerousCount"`
	LastAuthorization   string `json:"lastAuthorization"`
	LastAttestation     string `json:"lastAttestation"`
	LastDangerous       string `json:"lastDangerous"`
}

type StateResponse struct {
	StateVersion common.Hash `json:"stateVersion"`
	State        State       `json:"state"`
}
