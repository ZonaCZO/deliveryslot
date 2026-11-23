// Shared account interface; MySQL queries stay here for the real database mode.
export function mysqlUsers(pool) {
  return {
    async byEmail(email) {
      const [[user]] = await pool.execute('SELECT id, email, role, password_hash FROM users WHERE email=?', [email]);
      return user;
    },
    async byId(id) {
      const [[user]] = await pool.execute('SELECT id, email, role FROM users WHERE id=?', [id]);
      return user;
    },
  };
}
