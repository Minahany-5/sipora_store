import { supabase } from './supabase'
import type { Address } from '../types'

// Always filter by user_id. (The store team can read all addresses, but this list is only "mine".)
export async function fetchAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('id, label, full_address, latitude, longitude, phone, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Address[]
}

export async function addAddress(userId: string, input: { label: string; full_address: string; phone?: string | null }) {
  const { error } = await supabase.from('addresses').insert({
    user_id: userId,
    label: input.label.trim() || 'Home',
    full_address: input.full_address.trim(),
    phone: input.phone ?? null,
  })
  if (error) throw new Error('We could not save the address. Please try again.')
}

export async function deleteAddress(id: string) {
  const { error } = await supabase.from('addresses').delete().eq('id', id)
  if (error) throw new Error('We could not delete the address. Please try again.')
}
