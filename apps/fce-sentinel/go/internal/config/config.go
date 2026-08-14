package config

import (
	"os"
	"strconv"
	"time"
)

const (
	Version = "1.0.0"

	OPTypeSentinel = "SENTINEL"

	OPCommandAuthorizeSecret   = "AUTHORIZE_SECRET"
	OPCommandAttestPolicy      = "ATTEST_POLICY"
	OPCommandAuthorizeDangerous = "AUTHORIZE_DANGEROUS"
	OPCommandGetState          = "GET_STATE"

	TimeoutShutdown = 5 * time.Second
)

var (
	ExtensionPort = 8080
	SignPort      = 9090
)

func init() {
	ep := os.Getenv("EXTENSION_PORT")
	sp := os.Getenv("SIGN_PORT")
	if ep != "" {
		if v, err := strconv.Atoi(ep); err == nil {
			ExtensionPort = v
		}
	}
	if sp != "" {
		if v, err := strconv.Atoi(sp); err == nil {
			SignPort = v
		}
	}
}
