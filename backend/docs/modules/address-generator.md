# Module: address-generator

> **Source:** [`backend/src/modules/address-generator/`](../../src/modules/address-generator/)  
> **Related:** [System Overview](../system-overview.md) · [Architecture](../architecture.md)

---

## Purpose

The `address-generator` module generates Bitcoin deposit addresses and issues time-limited address tokens. Each token is associated with a Bitcoin address and a namespace (logical grouping), and expires after a configurable TTL or after a defined number of uses.

---

## Domain Model

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `Address` | [`domain/entities/address.entity.ts`](../../src/modules/address-generator/domain/entities/address.entity.ts) | A Bitcoin address with its namespace, creation time, and expiration |
| `AddressToken` | [`domain/entities/address-token.entity.ts`](../../src/modules/address-generator/domain/entities/address-token.entity.ts) | A one-time-use token that resolves to an `Address` |

### Value Objects

| Value Object | File | Description |
|-------------|------|-------------|
| `BitcoinAddress` | [`domain/value-objects/bitcoin-address.vo.ts`](../../src/modules/address-generator/domain/value-objects/bitcoin-address.vo.ts) | Validated Bitcoin address string |
| `AddressNamespace` | [`domain/value-objects/address-namespace.vo.ts`](../../src/modules/address-generator/domain/value-objects/address-namespace.vo.ts) | Logical namespace for address grouping |

### Domain Events

| Event | File | Description |
|-------|------|-------------|
| `ADDRESS_TOKEN_EMITTED` | [`domain/events/token-issued.event.ts`](../../src/modules/address-generator/domain/events/token-issued.event.ts) | A new address token was issued |
| `ADDRESS_TOKEN_RESOLVED` | — | Token was resolved to an address |
| `ADDRESS_TOKEN_EXPIRED` | — | Token expired (by TTL, usage, or manual revocation) |

### Domain Errors

| Error | File |
|-------|------|
| `AddressExpiredError` | [`domain/errors/address-expired.error.ts`](../../src/modules/address-generator/domain/errors/address-expired.error.ts) |
| `InvalidAddressError` | [`domain/errors/invalid-address.error.ts`](../../src/modules/address-generator/domain/errors/invalid-address.error.ts) |

### Policies

| Policy | File | Description |
|--------|------|-------------|
| `AddressExpirationPolicy` | [`domain/policies/address-expiration.policy.ts`](../../src/modules/address-generator/domain/policies/address-expiration.policy.ts) | Determines whether an address has expired |
| `AddressGenerationPolicy` | [`domain/policies/address-generation.policy.ts`](../../src/modules/address-generator/domain/policies/address-generation.policy.ts) | Validates whether a new address can be generated |

---

## Application Layer

### Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `GenerateAddressUseCase` | [`application/use-cases/generate-address.usecase.ts`](../../src/modules/address-generator/application/use-cases/generate-address.usecase.ts) | Generates a new Bitcoin deposit address |
| `IssueAddressTokenUseCase` | [`application/use-cases/issue-address-token.usecase.ts`](../../src/modules/address-generator/application/use-cases/issue-address-token.usecase.ts) | Issues a time-limited token pointing to an address |

### Ports

| Port | File |
|------|------|
| `AddressRepositoryPort` | [`application/ports/address-repository.port.ts`](../../src/modules/address-generator/application/ports/address-repository.port.ts) |
| `TokenRepositoryPort` | [`application/ports/token-repository.port.ts`](../../src/modules/address-generator/application/ports/token-repository.port.ts) |
| `RandomGeneratorPort` | [`application/ports/random-generator.port.ts`](../../src/modules/address-generator/application/ports/random-generator.port.ts) |

### DTOs

| DTO | File |
|-----|------|
| `GenerateAddressRequest` | [`application/dtos/generate-address.request.ts`](../../src/modules/address-generator/application/dtos/generate-address.request.ts) |
| `GenerateAddressResponse` | [`application/dtos/generate-address.response.ts`](../../src/modules/address-generator/application/dtos/generate-address.response.ts) |

---

## Infrastructure Layer

| Adapter | File | Description |
|---------|------|-------------|
| `RandomGeneratorAdapter` | [`infra/adapters/random-generator.adapter.ts`](../../src/modules/address-generator/infra/adapters/random-generator.adapter.ts) | Cryptographically secure random generation |
| `MockAddressGeneratorAdapter` | [`infra/adapters/mock-address-generator.adapter.ts`](../../src/modules/address-generator/infra/adapters/mock-address-generator.adapter.ts) | Test double for address generation |
| `AddressRepository` | [`infra/repositories/address.repository.ts`](../../src/modules/address-generator/infra/repositories/address.repository.ts) | In-memory address persistence |
| `TokenRepository` | [`infra/repositories/token.repository.ts`](../../src/modules/address-generator/infra/repositories/token.repository.ts) | In-memory token persistence |
| `AddressMapper` | [`infra/mappers/address.mapper.ts`](../../src/modules/address-generator/infra/mappers/address.mapper.ts) | Domain ↔ persistence mapping |

---

## Events Published

| Event | Trigger |
|-------|---------|
| `ADDRESS_TOKEN_EMITTED` | `IssueAddressTokenUseCase` completes successfully |
| `ADDRESS_TOKEN_RESOLVED` | Token is consumed to retrieve address |
| `ADDRESS_TOKEN_EXPIRED` | Token TTL expires or usage limit reached |

---

## Dependencies

This module has **no dependencies on other modules**. It only depends on the shared kernel.

---

## Operational Notes

- Address generation uses a mock adapter in development. For production, replace with a real Bitcoin address generator backed by an HD wallet or key derivation service.
- Tokens expire by TTL or usage count. Expired tokens should be pruned periodically.
- The `AddressNamespace` allows logical segregation of addresses by client, session, or pool.
