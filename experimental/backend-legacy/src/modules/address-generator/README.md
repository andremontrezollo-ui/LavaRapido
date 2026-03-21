# Address Generator Module

## Responsibility

Generates deposit addresses, issues one-time tokens, and manages address lifecycle (expiration, validation). Does **not** depend on blockchain infrastructure directly.

## Architecture

```
domain/
  entities/         Address, AddressToken
  value-objects/    BitcoinAddress (bc1/tb1 validation), AddressNamespace
  policies/         AddressExpirationPolicy, AddressGenerationPolicy
  events/           AddressGeneratedEvent, TokenIssuedEvent
  errors/           InvalidAddressError, AddressExpiredError

application/
  use-cases/        GenerateAddressUseCase, IssueAddressTokenUseCase
  dtos/             Request/Response DTOs
  ports/            AddressRepository, TokenRepository, RandomGenerator

infra/
  repositories/     InMemoryAddressRepository, InMemoryTokenRepository
  adapters/         CryptoRandomGenerator, MockAddressGenerator
  mappers/          AddressMapper (domain ↔ persistence)
```

## Dependency Rules

- **Domain** → nothing external
- **Application** → Domain, Shared Ports
- **Infra** → implements Application Ports, uses Domain entities

## Events

| Event | SystemEvent Type | When |
|-------|-----------------|------|
| `AddressGeneratedEvent` | `ADDRESS_TOKEN_EMITTED` | New address created |
| `TokenIssuedEvent` | `ADDRESS_TOKEN_RESOLVED` | Token issued for address |

## Policies

| Policy | Purpose |
|--------|---------|
| `AddressExpirationPolicy` | TTL per namespace purpose (deposit: 30m, withdrawal: 1h, internal: 24h) |
| `AddressGenerationPolicy` | Max active addresses per network (mainnet: 5, testnet: 20) |
