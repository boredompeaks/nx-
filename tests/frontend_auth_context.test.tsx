import { beforeEach, vi, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } })
    }
  })
}))
import { AuthProvider, useAuth, supabase } from '../web/src/context/AuthContext'

function TestComp(){
  const { signOut } = useAuth()
  React.useEffect(()=>{ signOut() },[])
  return <div>ok</div>
}

beforeEach(()=>{
  vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ data: {}, error: null } as any)
})

it('AuthContext signOut clears session via Supabase', async () => {
  render(<AuthProvider><TestComp/></AuthProvider>)
  expect(supabase.auth.signOut).toHaveBeenCalled()
})
