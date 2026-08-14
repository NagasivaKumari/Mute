package server

import extension "sentinel-fce/internal/extension"

func StartExtension(extensionPort, signPort int) <-chan error {
	e := extension.New(extensionPort, signPort)
	errCh := make(chan error, 1)
	go func() {
		if err := e.Server.ListenAndServe(); err != nil {
			errCh <- err
		}
	}()
	return errCh
}
