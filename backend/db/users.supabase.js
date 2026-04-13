import { assertSupabase } from '../lib/supabaseServer.js';

function sb() {
  return assertSupabase();
}

/** Columns required by mapUserRow only; avoids SELECT * for lower Supabase egress. */
const USER_ROW_SELECT = 'id, userid, password_hash, name, email, role, created_at, ssn, phone, address';

function mapUserRow(r) {
  if (!r) return undefined;
  return {
    id: Number(r.id),
    userid: r.userid,
    password_hash: r.password_hash,
    name: r.name,
    email: r.email,
    role: r.role,
    created_at: r.created_at
      ? String(r.created_at).replace('T', ' ').slice(0, 19)
      : '',
    ssn: r.ssn ?? '',
    phone: r.phone ?? '',
    address: r.address ?? '',
  };
}

export async function findByUserid(userid) {
  const { data, error } = await sb().from('users').select(USER_ROW_SELECT).eq('userid', userid).maybeSingle();
  if (error) throw error;
  return mapUserRow(data);
}

export async function findById(id) {
  const { data, error } = await sb().from('users').select(USER_ROW_SELECT).eq('id', Number(id)).maybeSingle();
  if (error) throw error;
  return mapUserRow(data);
}

export async function findIdByUserid(userid) {
  const u = await findByUserid(userid);
  return u ? { id: u.id } : undefined;
}

export async function insertUser({ userid, password_hash, name, email, role, ssn, phone, address }) {
  const { data, error } = await sb()
    .from('users')
    .insert({
      userid,
      password_hash,
      name,
      email,
      role,
      ssn: ssn || '',
      phone: phone || '',
      address: address || '',
    })
    .select(USER_ROW_SELECT)
    .single();
  if (error) throw error;
  return mapUserRow(data);
}

export async function updateRoleByUserid(userid, role) {
  const { error } = await sb().from('users').update({ role }).eq('userid', userid);
  if (error) throw error;
}

export async function updateRoleById(id, role) {
  const { error } = await sb().from('users').update({ role }).eq('id', Number(id));
  if (error) throw error;
}

export async function updateProfileById(id, { name, email, ssn, phone, address, password_hash }) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email;
  if (ssn !== undefined) patch.ssn = ssn;
  if (phone !== undefined) patch.phone = phone;
  if (address !== undefined) patch.address = address;
  if (password_hash !== undefined) patch.password_hash = password_hash;
  const { error } = await sb().from('users').update(patch).eq('id', Number(id));
  if (error) throw error;
}

export async function listUsersForRole(roleFilter) {
  let q = sb().from('users').select('id, userid, name, email, role, created_at, ssn, phone, address').order('created_at', { ascending: false });
  if (roleFilter) q = q.eq('role', roleFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r) => ({
    id: Number(r.id),
    userid: r.userid,
    name: r.name,
    email: r.email,
    role: r.role,
    created_at: r.created_at ? String(r.created_at).replace('T', ' ').slice(0, 19) : '',
    ssn: r.ssn ?? '',
    phone: r.phone ?? '',
    address: r.address ?? '',
  }));
}

export async function findIdOnly(userid) {
  return findIdByUserid(userid);
}
