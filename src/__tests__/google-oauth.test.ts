import { isAllowedDomain, buildGoogleAuthUrl } from '@/lib/google-oauth'

describe('isAllowedDomain', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('allows email when domain matches GOOGLE_ALLOWED_DOMAIN', () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'raizeducacao.com.br'
    expect(isAllowedDomain('usuario@raizeducacao.com.br')).toBe(true)
  })

  it('rejects email when domain does not match', () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'raizeducacao.com.br'
    expect(isAllowedDomain('usuario@gmail.com')).toBe(false)
  })

  it('allows email from subdomain of GOOGLE_ALLOWED_DOMAIN', () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'raizeducacao.com.br'
    expect(isAllowedDomain('usuario@sub.raizeducacao.com.br')).toBe(true)
  })

  it('allows email from nested subdomain of GOOGLE_ALLOWED_DOMAIN', () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'raizeducacao.com.br'
    expect(isAllowedDomain('usuario@a.b.raizeducacao.com.br')).toBe(true)
  })

  it('rejects email from domain that ends with but is not a subdomain', () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'raizeducacao.com.br'
    expect(isAllowedDomain('usuario@fakraizeducacao.com.br')).toBe(false)
  })

  it('allows any domain when GOOGLE_ALLOWED_DOMAIN is not set', () => {
    delete process.env.GOOGLE_ALLOWED_DOMAIN
    expect(isAllowedDomain('usuario@qualquerdominio.com')).toBe(true)
  })

  it('is case-insensitive for domain comparison', () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'raizeducacao.com.br'
    expect(isAllowedDomain('usuario@RAIZEDUCACAO.COM.BR')).toBe(true)
  })
})

describe('buildGoogleAuthUrl', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  })

  it('includes required OAuth parameters', () => {
    const url = buildGoogleAuthUrl('https://app.com/api/auth/google/callback', 'test-state-123')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('response_type=code')
    expect(url).toContain('state=test-state-123')
    expect(url).toContain('scope=openid+email+profile')
    expect(url).toContain(encodeURIComponent('https://app.com/api/auth/google/callback'))
  })

  it('points to Google authorization endpoint', () => {
    const url = buildGoogleAuthUrl('https://app.com/callback', 'state')
    expect(url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
  })
})
