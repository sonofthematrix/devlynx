# ZenStack v3 (optioneel) in dit monorepo

## Scheiding met DevLynx-auth


| Onderdeel                 | Waar                                                       | Rol                                             |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| **DevLynx Pro/trial JWT** | `scripts/gen-license-jwt-keys.js`, `feed-server`, extensie | Gumroad + RS256 tokens voor Pro/trial           |
| **ZenStack `auth()`**     | Eigen backend + ZModel policies                            | Jouw toekomstige DB/RBAC-laag — apart ontwerpen |


Verwissel deze **niet** zonder bewuste migratie.

## Aanbevolen aanpak

1. Nieuwe map, bv. `packages/data/` met eigen `package.json`.
2. Daar: ZenStack v3 quick start / `init` volgens [ZenStack docs](https://zenstack.dev) (v3 / `@next` tags controleren).
3. Root- en `feed-server`-builds niet laten afhangen van ZenStack totdat je expliciet koppelt.

## Cursor

- Regel: `**.cursor/rules/zenstack-v3-init.mdc`** (triggert op `*.zmodel` / `zenstack/**`).
- Geheugen: plaktekst in `**developer/CURSOR-MEMORY-ZENSTACK.md**`.

