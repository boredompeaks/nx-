import { it, expect, vi } from 'vitest'
import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import E2EEPasswordModal from '../web/src/components/E2EEPasswordModal'

it('E2EEPasswordModal shows validation error for short password', async () => {
  const onClose = vi.fn()
  const onUnlock = vi.fn()
  render(<E2EEPasswordModal chatId="chat-1" onClose={onClose} onUnlock={onUnlock} />)
  const input = screen.getByPlaceholderText('Enter passphrase') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'short' } })
  fireEvent.click(screen.getByText('Unlock'))
  await new Promise(r=>setTimeout(r, 5))
  expect(onUnlock).not.toHaveBeenCalled()
  expect(screen.getByText('Minimum 8 characters')).toBeTruthy()
})
