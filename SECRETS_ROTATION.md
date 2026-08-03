# Fitscore Secrets Rotation Checklist

This document records rotation status only. Never paste a password, token, private
key, service-account JSON, keystore, or any other secret value into this file, a
commit, an issue, or a chat message.

## Rotation checklist

Phase 5 of `SECURITY_HARDENING.md` names the following production credentials.
Rotate a credential by creating its replacement, updating the authorized secret
stores, deploying and testing the replacement, and then revoking the old value.

| Done | Credential named in Phase 5 | Configuration reference | Rotation record |
|---|---|---|---|
| [ ] | PostgreSQL/Supabase database password | `DB_PASSWORD` / hosted database connection settings | Rotated on `<date>`, rotated by `<who>` |
| [ ] | JWT signing secret | `JWT_SECRET` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Gemini API key | `GEMINI_API_KEY` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Cloudinary API secret | `CLOUDINARY_API_SECRET` (update its paired API key/account configuration if the provider replaces the pair) | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Razorpay secret | `RAZORPAY_KEY_SECRET` (update `RAZORPAY_KEY_ID` if a new key pair is issued) | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Brevo API key | `BREVO_API_KEY` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | RevenueCat secret API key | `REVENUECAT_SECRET_KEY` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | RevenueCat webhook authorization value | `REVENUECAT_WEBHOOK_AUTH` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | RevenueCat webhook signing secret | `REVENUECAT_WEBHOOK_SIGNING_SECRET` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Google service-account key | `GOOGLE_SERVICE_ACCOUNT_JSON` and the corresponding cloud service-account key | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Android signing keystore/key material | Secure keystore storage and Google Play Console, as applicable | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Android signing keystore store password | Local/CI signing configuration; never commit it to `havenn/build.json` | Rotated on `<date>`, rotated by `<who>` |
| [ ] | Android signing key/alias password | Local/CI signing configuration; never commit it to `havenn/build.json` | Rotated on `<date>`, rotated by `<who>` |

For a released Android app, do not replace the app-signing key without first
checking Google Play App Signing requirements. If only a keystore password was
exposed, change the password and protected configuration. If the key material was
exposed, follow the Play Console process for resetting the upload key or otherwise
coordinating signing-key recovery.

For every row:

1. Create the replacement in the provider console or approved secrets manager.
2. Update Render, CI/CD, and authorized local signing configuration without
   writing the value to Git.
3. Redeploy and test the dependent database, authentication, API, webhook, or
   release-signing flow.
4. Revoke or disable the old credential.
5. Record only the completion date and responsible person in the table above.

## Purging the historical `havenn/build.json` password

These are instructions only. They intentionally have not been executed. History
rewriting changes commit IDs and requires coordination across every clone, branch,
tag, fork, and open pull request.

### Before the rewrite

1. Rotate the exposed signing password first. Removing it from Git history does
   not make the old credential safe.
2. Notify every contributor and freeze pushes and merges until the rewrite and
   verification are complete.
3. Ensure required unpushed work is backed up as reviewed patches. Do not copy the
   exposed password into a patch, command line, filename, or shell history.
4. Record the repository URL and review branch protections, protected tags,
   mirrors, forks, CI artifacts, release artifacts, and backups that may retain
   the historical file.
5. Install a current `git-filter-repo` release and perform the operation from a
   new mirror clone, not an existing working copy.

### Rewrite and verify locally

Run the following in a separate temporary location, replacing the placeholder URL:

```powershell
git clone --mirror <REPOSITORY_URL> fitscore-history-cleanup.git
Set-Location fitscore-history-cleanup.git
git filter-repo --sensitive-data-removal --path havenn/build.json --invert-paths
```

The command removes `havenn/build.json` from every rewritten revision. If a clean,
secret-free version of that file is still required, add it later in a normal new
commit after the rewritten repository has been cloned and verified. Do not restore
the historical file from an old commit.

Verify that no reachable ref still contains the path:

```powershell
git log --all --name-status -- havenn/build.json
git rev-list --objects --all | Select-String -SimpleMatch 'havenn/build.json'
```

Both commands should return no matching historical object. Inspect the rewritten
branches and tags before publishing them. Do not search for the old password by
putting its literal value on a command line, because that would create another
copy in shell history and possibly process logs.

### Force-push the rewrite

`git-filter-repo` may remove the `origin` remote as a safety measure. Inspect the
remote configuration and restore it only if needed:

```powershell
git remote -v
git remote add origin <REPOSITORY_URL>
git push --force --mirror origin
```

The final command force-updates all pushable branches and tags. Temporarily adjust
branch protection only if necessary, restore it immediately afterward, and confirm
that no work was pushed after the freeze. Hosting-provider-managed or pull-request
refs may require provider support because they are not always directly pushable.

### Team and remote cleanup warning

Every contributor must stop using the old clone and make a fresh clone after the
force-push. Do not merge or pull old branches into the rewritten repository: doing
so can reintroduce the secret and the discarded history. Carefully inspect and
reapply only necessary, secret-free patches onto the new history.

Also remove or replace stale forks, mirrors, CI workspaces, cached artifacts,
release bundles, and backups according to the organization's retention rules.
Ask the Git hosting provider to clear inaccessible cached views or pull-request
references when applicable. Finally, clone the remote into another clean directory
and repeat the path checks above before lifting the collaboration freeze.

References:

- [git-filter-repo manual](https://github.com/newren/git-filter-repo/blob/master/Documentation/git-filter-repo.txt)
- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## Verification snapshot

- `Backend/.env.example`: verified on 2026-08-01. Secret-bearing entries are
  empty or use explicit replacement placeholders; no live-looking values were
  found. Non-secret defaults such as ports, localhost URLs, package identifiers,
  issuers, audiences, and limits remain populated.
- Requested tracked-file credential-pattern scan: one hit at
  `SECURITY_HARDENING.md:143`. It is the literal example scan command documented
  in that file, not a credential value. No actual credential hit was found.

