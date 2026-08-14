package main

import (
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/flare-foundation/go-flare-common/pkg/logger"
	teeServer "github.com/flare-foundation/tee-node/pkg/server"

	"sentinel-fce/internal/config"
	extserver "sentinel-fce/pkg/server"
)

func main() {
	configPort := intEnv("CONFIG_PORT", 5501)

	signPort := config.SignPort
	extensionPort := config.ExtensionPort

	go teeServer.StartServerExtension(configPort, signPort, extensionPort)

	extErrCh := extserver.StartExtension(extensionPort, signPort)

	time.Sleep(100 * time.Millisecond)
	select {
	case err := <-extErrCh:
		logger.Fatalf("extension server failed to start: %v", err)
	default:
	}

	logger.Infof("sentinel-fce TEE running (config=%d, sign=%d, ext=%d)", configPort, signPort, extensionPort)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	select {
	case <-sigChan:
		logger.Info("shutting down")
	case err := <-extErrCh:
		logger.Fatalf("extension server error: %v", err)
	}
}

func intEnv(key string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return fallback
}
