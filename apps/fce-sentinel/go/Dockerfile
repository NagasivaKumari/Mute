# Builder stage
FROM golang:1.25.1-alpine3.21 AS builder

RUN apk add --no-cache make gcc musl-dev linux-headers git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /app/extension-tee ./cmd/docker

# Runtime stage
FROM gcr.io/distroless/static

COPY --from=builder /app/extension-tee /app/extension-tee

# MODE=1 is SIMULATED attestation (Coston2 dev). MODE=0 is production attestation.
ENV MODE=1 CONFIG_PORT=5501 SIGN_PORT=7701 EXTENSION_PORT=7702

EXPOSE 5501 7701 7702

CMD ["/app/extension-tee"]
