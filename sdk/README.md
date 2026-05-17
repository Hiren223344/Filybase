# @filybase/sdk

Official client SDK for [FilyBase](https://filybase.io) — Auth, Database, and Edge Functions in one package.

## Install

```bash
npm install @filybase/sdk
```

## Quick Start

```ts
import { createFilybase } from '@filybase/sdk'

const fily = createFilybase({
  url: 'https://filybase.io/api',
  projectId: 'my-project',
  anonKey: 'fb_anon_...'
})
```

## Authentication

```ts
// Sign up
const { data, error } = await fily.auth.signUp({
  email: 'user@example.com',
  password: 'securepass123',
  name: 'Jane Doe'
})

// Sign in
const { data } = await fily.auth.signIn({
  email: 'user@example.com',
  password: 'securepass123'
})

// Get user
const { data: user } = await fily.auth.getUser(data.accessToken)

// Sign out
await fily.auth.signOut(data.refreshToken)
```

## Database

```ts
// Select with filters
const { data } = await fily.db
  .from('todos')
  .eq('status', 'active')
  .order('created_at', 'desc')
  .limit(20)
  .select()

// Insert
await fily.db.from('todos').insert({ title: 'Buy milk', done: false })

// Update
await fily.db.from('todos').eq('id', '5').update({ done: true })

// Delete
await fily.db.from('todos').eq('id', '5').delete()

// Raw SQL
await fily.db.query('SELECT * FROM todos WHERE user_id = $1', ['abc'])
```

## Edge Functions

```ts
const { data } = await fily.functions.invoke('send-email', {
  body: { to: 'user@example.com', subject: 'Hello' }
})
```

## Auth Client (Browser)

For browser apps with auto-refresh and session persistence:

```ts
import { createFilyAuth } from '@filybase/sdk/auth'

const auth = createFilyAuth({
  baseUrl: 'https://filybase.io/api/auth/my-project',
  anonKey: 'fb_anon_...'
})

await auth.signUp({ email, password, name })
await auth.signIn({ email, password })
const user = await auth.getUser()
await auth.signOut()
```

## Links

- [Documentation](https://filybase.io/docs)
- [GitHub](https://github.com/Hiren223344/Filybase)
- [Dashboard](https://filybase.io/dashboard)
