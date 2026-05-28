# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Role | Status string | Meaning |
| ---- | ------------- | ------- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

For local-markdown issues, the status is recorded as a `Status:` line at the top of the issue file. When a skill mentions a role (e.g. "mark this as ready for an AFK agent"), write or update the `Status:` line using the corresponding string from this table.
