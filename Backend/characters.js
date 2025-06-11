const express = require("express");
const router = express.Router();
const authenticateToken = require("./authMiddleware");
const { pool } = require("./db");

// Listar personagens do usuário
router.get("/characters", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query("SELECT * FROM characters WHERE user_id = $1", [userId]);
    res.json({ characters: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar personagens" });
  }
});

// Criar novo personagem
router.post("/characters", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const {
    nome,
    classe_nivel,
    antecedente,
    nome_jogador,
    raca,
    alinhamento,
    pontos_experiencia,
    classe_armadura,
    iniciativa,
    deslocamento,
    pontos_vida_max,
    pontos_vida_atual,
    pontos_vida_temp,
    dado_vida,
    traços_personalidade,
    ideais,
    vínculos,
    fraquezas,
    idade,
    altura,
    peso,
    cor_olhos,
    cor_pele,
    cor_cabelo,
    caracteristicas_adicionais,
  } = req.body;

  try {
    const query = `
      INSERT INTO characters (
        user_id, nome, classe_nivel, antecedente, nome_jogador, raca, alinhamento, pontos_experiencia,
        classe_armadura, iniciativa, deslocamento, pontos_vida_max, pontos_vida_atual, pontos_vida_temp,
        dado_vida, traços_personalidade, ideais, vínculos, fraquezas, idade, altura, peso,
        cor_olhos, cor_pele, cor_cabelo, caracteristicas_adicionais
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26
      ) RETURNING *;
    `;

    const values = [
      userId,
      nome,
      classe_nivel,
      antecedente,
      nome_jogador,
      raca,
      alinhamento,
      pontos_experiencia,
      classe_armadura,
      iniciativa,
      deslocamento,
      pontos_vida_max,
      pontos_vida_atual,
      pontos_vida_temp,
      dado_vida,
      traços_personalidade,
      ideais,
      vínculos,
      fraquezas,
      idade,
      altura,
      peso,
      cor_olhos,
      cor_pele,
      cor_cabelo,
      caracteristicas_adicionais,
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ character: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar personagem" });
  }
});

module.exports = router;
