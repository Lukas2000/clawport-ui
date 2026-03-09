import { NextResponse } from 'next/server'
import { getDocTree } from '@/lib/docs-browser'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getDocTree())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load docs tree')
  }
}
