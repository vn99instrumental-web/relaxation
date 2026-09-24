import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeChatBody, encodeChatBody, safeChatImageUrl } from '../src/lib/chatMessage.js'

test('rich chat body preserves image and quote', () => {
  const encoded = encodeChatBody({ text: 'Xin chào', imageUrl: 'https://example.com/a.jpg', replyTo: { id: '1', user: 'RT', text: 'Chào' } })
  assert.deepEqual(decodeChatBody(encoded), {
    text: 'Xin chào', imageUrl: 'https://example.com/a.jpg', imagePath: '',
    replyTo: { id: '1', user: 'RT', text: 'Chào', hasImage: false },
  })
})

test('chat image URL rejects executable protocols', () => {
  assert.equal(safeChatImageUrl('javascript:alert(1)'), '')
})
