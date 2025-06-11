const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Teste de conexão ao iniciar
(async () => {
  try {
    const res = await pool.query("SELECT now()");
    console.log("Pool conectado em:", res.rows[0]);
  } catch (err) {
    console.error("Erro na conexão com o banco:", err);
  }
})();

// CRUD Básico

async function selectUsers() {
  const res = await pool.query("SELECT * FROM users");
  return res.rows;
}

async function selectUser(username) {
  const res = await pool.query("SELECT * FROM users WHERE USERNAME = $1", [username]);
  return res.rows;
}

async function insertUser(user) {
  // Verifica duplicados
  const res = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $2", [user.username, user.email]);
  if (res.rows.length > 0) {
    throw new Error("DUPLICATE_ENTRY");
  }

  const hashedPassword = await bcrypt.hash(user.senha, 10);
  await pool.query("INSERT INTO users(username, email, senha) VALUES ($1, $2, $3)", [user.username, user.email, hashedPassword]);
}

async function updateUser(username, user) {
  if (user.senha) {
    const hashedPassword = await bcrypt.hash(user.senha, 10);
    await pool.query(
      "UPDATE users SET username=$1, email=$2, senha=$3 WHERE username=$4",
      [user.username, user.email, hashedPassword, username]
    );
  } else {
    await pool.query(
      "UPDATE users SET username=$1, email=$2 WHERE username=$3",
      [user.username, user.email, username]
    );
  }
}

async function updatePassword(username, novaSenha) {
  const hashedPassword = await bcrypt.hash(novaSenha, 10);
  await pool.query("UPDATE users SET senha = $1 WHERE username = $2", [hashedPassword, username]);
}

async function deleteUser(username) {
  await pool.query("DELETE FROM users WHERE username=$1", [username]);
}

async function selectUserByUsernameOrEmail(username, email) {
  const res = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $2", [username, email]);
  return res.rows;
}

module.exports = {
  pool,
  selectUsers,
  selectUser,
  insertUser,
  updateUser,
  deleteUser,
  selectUserByUsernameOrEmail,
  updatePassword,
};
