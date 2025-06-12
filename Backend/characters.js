// characters.js - Versão simplificada e funcional
const express = require("express");
const router = express.Router();
const authenticateToken = require("./authMiddleware");
const { pool } = require("./db");

// Listar personagens do usuário
router.get("/characters", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT 
        id, 
        nome, 
        classe_nivel, 
        raca, 
        pontos_vida_atual,
        pontos_vida_max,
        created_at 
      FROM characters 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ characters: result.rows });
  } catch (error) {
    console.error("Erro ao buscar personagens:", error);
    res.status(500).json({ error: "Erro ao buscar personagens" });
  }
});

// Buscar um personagem específico
router.get("/characters/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT * FROM characters 
      WHERE id = $1 AND user_id = $2
    `, [characterId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    res.json({ character: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar personagem:", error);
    res.status(500).json({ error: "Erro ao buscar personagem" });
  }
});

// Criar novo personagem
router.post("/characters", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const {
      nome, classe_nivel, antecedente, nome_jogador, raca, alinhamento,
      pontos_experiencia, classe_armadura, iniciativa, deslocamento,
      pontos_vida_max, pontos_vida_atual, pontos_vida_temp, dado_vida,
      sucesso1, sucesso2, sucesso3, falha1, falha2, falha3,
      traços_personalidade, ideais, vínculos, fraquezas, idade,
      altura, peso, cor_olhos, cor_pele, cor_cabelo, caracteristicas_adicionais
    } = req.body;

    // Função para converter checkbox
    function convertCheckbox(value) {
      return (value === true || value === 1 || value === "1") ? 1 : 0;
    }

    const query = `
      INSERT INTO characters (
        user_id, nome, classe_nivel, antecedente, nome_jogador, raca, alinhamento, 
        pontos_experiencia, classe_armadura, iniciativa, deslocamento, 
        pontos_vida_max, pontos_vida_atual, pontos_vida_temp, dado_vida,
        sucesso1, sucesso2, sucesso3, falha1, falha2, falha3,
        traços_personalidade, ideais, vínculos, fraquezas, idade, altura, peso,
        cor_olhos, cor_pele, cor_cabelo, caracteristicas_adicionais, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, NOW()
      ) RETURNING id, nome, classe_nivel, created_at;
    `;

    const values = [
      userId,
      nome,
      classe_nivel,
      antecedente,
      nome_jogador,
      raca,
      alinhamento,
      pontos_experiencia || null,
      classe_armadura || null,
      iniciativa || null,
      deslocamento || null,
      pontos_vida_max || null,
      pontos_vida_atual || null,
      pontos_vida_temp || null,
      dado_vida,
      convertCheckbox(sucesso1),
      convertCheckbox(sucesso2),
      convertCheckbox(sucesso3),
      convertCheckbox(falha1),
      convertCheckbox(falha2),
      convertCheckbox(falha3),
      traços_personalidade,
      ideais,
      vínculos,
      fraquezas,
      idade || null,
      altura,
      peso,
      cor_olhos,
      cor_pele,
      cor_cabelo,
      caracteristicas_adicionais,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Personagem criado com sucesso",
      character: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao criar personagem:", error);
    res.status(500).json({ error: "Erro ao criar personagem" });
  }
});

// Deletar personagem
router.get("/characters/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== BUSCANDO PERSONAGEM ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    const result = await pool.query(`
      SELECT * FROM characters 
      WHERE id = $1 AND user_id = $2
    `, [characterId, userId]);

    console.log("Resultado da query:", result.rows);
    console.log("Número de personagens encontrados:", result.rows.length);

    if (result.rows.length === 0) {
      console.log("Personagem não encontrado");
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    const character = result.rows[0];
    console.log("Personagem encontrado:", character.nome);

    res.json({ character: character });
  } catch (error) {
    console.error("Erro ao buscar personagem:", error);
    res.status(500).json({ error: "Erro ao buscar personagem" });
  }
});

// Selecionar personagem como ativo
router.post("/characters/:id/select", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  try {
    // Verificar se personagem existe e pertence ao usuário
    const checkResult = await pool.query(`
      SELECT id FROM characters 
      WHERE id = $1 AND user_id = $2
    `, [characterId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    // Desativar todos os personagens do usuário
    await pool.query(`
      UPDATE characters 
      SET is_active = false 
      WHERE user_id = $1
    `, [userId]);

    // Ativar o personagem selecionado
    await pool.query(`
      UPDATE characters 
      SET is_active = true 
      WHERE id = $1
    `, [characterId]);

    res.json({ message: "Personagem selecionado com sucesso" });
  } catch (error) {
    console.error("Erro ao selecionar personagem:", error);
    res.status(500).json({ error: "Erro ao selecionar personagem" });
  }
});

// Atualizar personagem existente
router.put("/characters/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== ATUALIZANDO PERSONAGEM ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);
  console.log("Dados recebidos:", req.body);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      console.log("Personagem não encontrado ou não pertence ao usuário");
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    const {
      nome, classe_nivel, antecedente, nome_jogador, raca, alinhamento,
      pontos_experiencia, classe_armadura, iniciativa, deslocamento,
      pontos_vida_max, pontos_vida_atual, pontos_vida_temp, dado_vida,
      sucesso1, sucesso2, sucesso3, falha1, falha2, falha3,
      traços_personalidade, ideais, vínculos, fraquezas, idade,
      altura, peso, cor_olhos, cor_pele, cor_cabelo, caracteristicas_adicionais
    } = req.body;

    // Função para converter checkbox
    function convertCheckbox(value) {
      return (value === true || value === 1 || value === "1") ? 1 : 0;
    }

    const query = `
      UPDATE characters SET
        nome = $1,
        classe_nivel = $2,
        antecedente = $3,
        nome_jogador = $4,
        raca = $5,
        alinhamento = $6,
        pontos_experiencia = $7,
        classe_armadura = $8,
        iniciativa = $9,
        deslocamento = $10,
        pontos_vida_max = $11,
        pontos_vida_atual = $12,
        pontos_vida_temp = $13,
        dado_vida = $14,
        sucesso1 = $15,
        sucesso2 = $16,
        sucesso3 = $17,
        falha1 = $18,
        falha2 = $19,
        falha3 = $20,
        traços_personalidade = $21,
        ideais = $22,
        vínculos = $23,
        fraquezas = $24,
        idade = $25,
        altura = $26,
        peso = $27,
        cor_olhos = $28,
        cor_pele = $29,
        cor_cabelo = $30,
        caracteristicas_adicionais = $31,
        updated_at = NOW()
      WHERE id = $32 AND user_id = $33
      RETURNING id, nome, updated_at;
    `;

    const values = [
      nome,
      classe_nivel,
      antecedente,
      nome_jogador,
      raca,
      alinhamento,
      pontos_experiencia || null,
      classe_armadura || null,
      iniciativa || null,
      deslocamento || null,
      pontos_vida_max || null,
      pontos_vida_atual || null,
      pontos_vida_temp || null,
      dado_vida,
      convertCheckbox(sucesso1),
      convertCheckbox(sucesso2),
      convertCheckbox(sucesso3),
      convertCheckbox(falha1),
      convertCheckbox(falha2),
      convertCheckbox(falha3),
      traços_personalidade,
      ideais,
      vínculos,
      fraquezas,
      idade || null,
      altura,
      peso,
      cor_olhos,
      cor_pele,
      cor_cabelo,
      caracteristicas_adicionais,
      characterId,
      userId
    ];

    const result = await pool.query(query, values);

    console.log("Personagem atualizado:", result.rows[0]);

    res.json({
      message: "Personagem atualizado com sucesso",
      character: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao atualizar personagem:", error);
    res.status(500).json({ error: "Erro ao atualizar personagem" });
  }
});

// Deletar personagem
router.delete("/characters/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== DELETANDO PERSONAGEM ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    // Verificar se o personagem existe e pertence ao usuário
    const checkResult = await pool.query(`
      SELECT id, nome FROM characters 
      WHERE id = $1 AND user_id = $2
    `, [characterId, userId]);

    if (checkResult.rows.length === 0) {
      console.log("Personagem não encontrado ou não pertence ao usuário");
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    const personagem = checkResult.rows[0];
    console.log("Personagem encontrado:", personagem.nome);

    // Deletar o personagem
    const result = await pool.query(`
      DELETE FROM characters 
      WHERE id = $1 AND user_id = $2 
      RETURNING nome
    `, [characterId, userId]);

    console.log("Personagem deletado:", result.rows[0].nome);

    res.json({
      message: "Personagem deletado com sucesso",
      nome: result.rows[0].nome
    });
  } catch (error) {
    console.error("Erro ao deletar personagem:", error);
    res.status(500).json({ error: "Erro ao deletar personagem" });
  }
});

// Buscar atributos de um personagem
router.get("/characters/:id/attributes", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== BUSCANDO ATRIBUTOS ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    // Buscar atributos do personagem
    const result = await pool.query(
      "SELECT * FROM character_attributes WHERE character_id = $1",
      [characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Atributos não encontrados" });
    }

    console.log("Atributos encontrados para personagem", characterId);
    res.json({ attributes: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar atributos:", error);
    res.status(500).json({ error: "Erro ao buscar atributos" });
  }
});

// Salvar/Atualizar atributos de um personagem
router.post("/characters/:id/attributes", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== SALVANDO ATRIBUTOS ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);
  console.log("Atributos recebidos:", req.body);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    const {
      forca, destreza, constituicao, inteligencia, sabedoria, carisma,
      inspiracao, bonus_proficiencia,
      salvaguarda_forca, salvaguarda_destreza, salvaguarda_constituicao,
      salvaguarda_inteligencia, salvaguarda_sabedoria, salvaguarda_carisma,
      acrobacia, arcanismo, atletismo, atuacao, enganacao, furtividade,
      historia, intimidacao, intuicao, investigacao, lidar_com_animais,
      medicina, natureza, percepcao, persuasao, prestidigitacao,
      religiao, sobrevivencia
    } = req.body;

    // Verificar se já existem atributos para este personagem
    const existingAttributes = await pool.query(
      "SELECT id FROM character_attributes WHERE character_id = $1",
      [characterId]
    );

    let result;

    if (existingAttributes.rows.length > 0) {
      // Atualizar atributos existentes
      console.log("Atualizando atributos existentes");

      const updateQuery = `
        UPDATE character_attributes SET
          forca = $1, destreza = $2, constituicao = $3, inteligencia = $4, sabedoria = $5, carisma = $6,
          inspiracao = $7, bonus_proficiencia = $8,
          salvaguarda_forca = $9, salvaguarda_destreza = $10, salvaguarda_constituicao = $11,
          salvaguarda_inteligencia = $12, salvaguarda_sabedoria = $13, salvaguarda_carisma = $14,
          acrobacia = $15, arcanismo = $16, atletismo = $17, atuacao = $18, enganacao = $19,
          furtividade = $20, historia = $21, intimidacao = $22, intuicao = $23, investigacao = $24,
          lidar_com_animais = $25, medicina = $26, natureza = $27, percepcao = $28, persuasao = $29,
          prestidigitacao = $30, religiao = $31, sobrevivencia = $32, updated_at = NOW()
        WHERE character_id = $33
        RETURNING id, character_id, updated_at;
      `;

      const values = [
        forca || 10, destreza || 10, constituicao || 10, inteligencia || 10, sabedoria || 10, carisma || 10,
        inspiracao || 0, bonus_proficiencia || 2,
        salvaguarda_forca || 0, salvaguarda_destreza || 0, salvaguarda_constituicao || 0,
        salvaguarda_inteligencia || 0, salvaguarda_sabedoria || 0, salvaguarda_carisma || 0,
        acrobacia || 0, arcanismo || 0, atletismo || 0, atuacao || 0, enganacao || 0,
        furtividade || 0, historia || 0, intimidacao || 0, intuicao || 0, investigacao || 0,
        lidar_com_animais || 0, medicina || 0, natureza || 0, percepcao || 0, persuasao || 0,
        prestidigitacao || 0, religiao || 0, sobrevivencia || 0, characterId
      ];

      result = await pool.query(updateQuery, values);
    } else {
      // Criar novos atributos
      console.log("Criando novos atributos");

      const insertQuery = `
        INSERT INTO character_attributes (
          character_id, forca, destreza, constituicao, inteligencia, sabedoria, carisma,
          inspiracao, bonus_proficiencia,
          salvaguarda_forca, salvaguarda_destreza, salvaguarda_constituicao,
          salvaguarda_inteligencia, salvaguarda_sabedoria, salvaguarda_carisma,
          acrobacia, arcanismo, atletismo, atuacao, enganacao, furtividade,
          historia, intimidacao, intuicao, investigacao, lidar_com_animais,
          medicina, natureza, percepcao, persuasao, prestidigitacao,
          religiao, sobrevivencia, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, NOW(), NOW()
        ) RETURNING id, character_id, created_at;
      `;

      const values = [
        characterId,
        forca || 10, destreza || 10, constituicao || 10, inteligencia || 10, sabedoria || 10, carisma || 10,
        inspiracao || 0, bonus_proficiencia || 2,
        salvaguarda_forca || 0, salvaguarda_destreza || 0, salvaguarda_constituicao || 0,
        salvaguarda_inteligencia || 0, salvaguarda_sabedoria || 0, salvaguarda_carisma || 0,
        acrobacia || 0, arcanismo || 0, atletismo || 0, atuacao || 0, enganacao || 0,
        furtividade || 0, historia || 0, intimidacao || 0, intuicao || 0, investigacao || 0,
        lidar_com_animais || 0, medicina || 0, natureza || 0, percepcao || 0, persuasao || 0,
        prestidigitacao || 0, religiao || 0, sobrevivencia || 0
      ];

      result = await pool.query(insertQuery, values);
    }

    console.log("Atributos salvos com sucesso:", result.rows[0]);

    res.json({
      message: "Atributos salvos com sucesso",
      attributes: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao salvar atributos:", error);
    res.status(500).json({ error: "Erro ao salvar atributos" });
  }
});

// Buscar habilidades de um personagem
router.get("/characters/:id/abilities", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== BUSCANDO HABILIDADES ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    // Buscar habilidades do personagem
    const result = await pool.query(
      "SELECT * FROM character_abilities WHERE character_id = $1",
      [characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Habilidades não encontradas" });
    }

    console.log("Habilidades encontradas para personagem", characterId);
    res.json({ abilities: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar habilidades:", error);
    res.status(500).json({ error: "Erro ao buscar habilidades" });
  }
});

// Salvar/Atualizar habilidades de um personagem
router.post("/characters/:id/abilities", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== SALVANDO HABILIDADES ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);
  console.log("Habilidades recebidas:", req.body);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    const {
      ataques_conjuracao,
      caracteristicas_talentos,
      outras_proficiencias_idiomas
    } = req.body;

    // Verificar se já existem habilidades para este personagem
    const existingAbilities = await pool.query(
      "SELECT id FROM character_abilities WHERE character_id = $1",
      [characterId]
    );

    let result;
    
    if (existingAbilities.rows.length > 0) {
      // Atualizar habilidades existentes
      console.log("Atualizando habilidades existentes");
      
      const updateQuery = `
        UPDATE character_abilities SET
          ataques_conjuracao = $1,
          caracteristicas_talentos = $2,
          outras_proficiencias_idiomas = $3,
          updated_at = NOW()
        WHERE character_id = $4
        RETURNING id, character_id, updated_at;
      `;

      const values = [
        JSON.stringify(ataques_conjuracao || []),
        caracteristicas_talentos || '',
        outras_proficiencias_idiomas || '',
        characterId
      ];

      result = await pool.query(updateQuery, values);
    } else {
      // Criar novas habilidades
      console.log("Criando novas habilidades");
      
      const insertQuery = `
        INSERT INTO character_abilities (
          character_id,
          ataques_conjuracao,
          caracteristicas_talentos,
          outras_proficiencias_idiomas,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, NOW(), NOW()
        ) RETURNING id, character_id, created_at;
      `;

      const values = [
        characterId,
        JSON.stringify(ataques_conjuracao || []),
        caracteristicas_talentos || '',
        outras_proficiencias_idiomas || ''
      ];

      result = await pool.query(insertQuery, values);
    }

    console.log("Habilidades salvas com sucesso:", result.rows[0]);
    
    res.json({ 
      message: "Habilidades salvas com sucesso",
      abilities: result.rows[0] 
    });
  } catch (error) {
    console.error("Erro ao salvar habilidades:", error);
    res.status(500).json({ error: "Erro ao salvar habilidades" });
  }
});

// Buscar magias de um personagem
router.get("/characters/:id/spells", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== BUSCANDO MAGIAS ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    // Buscar magias do personagem
    const result = await pool.query(
      "SELECT * FROM character_spells WHERE character_id = $1",
      [characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Magias não encontradas" });
    }

    console.log("Magias encontradas para personagem", characterId);
    res.json({ spells: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar magias:", error);
    res.status(500).json({ error: "Erro ao buscar magias" });
  }
});

// Buscar magias de um personagem
router.get("/characters/:id/spells", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== BUSCANDO MAGIAS ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    // Buscar magias do personagem
    const result = await pool.query(
      "SELECT * FROM character_spells WHERE character_id = $1",
      [characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Magias não encontradas" });
    }

    console.log("Magias encontradas para personagem", characterId);
    res.json({ spells: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar magias:", error);
    res.status(500).json({ error: "Erro ao buscar magias" });
  }
});

// Salvar/Atualizar magias de um personagem
router.post("/characters/:id/spells", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== SALVANDO MAGIAS ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);
  console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      console.log("Personagem não encontrado ou não pertence ao usuário");
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    console.log("Personagem verificado, extraindo dados...");

    const {
      classe_conjuradora,
      cd_resistencia,
      bonus_ataque_magia,
      habilidade_chave,
      truques,
      nivel_1_espacos_total, nivel_1_espacos_usados, nivel_1_magias,
      nivel_2_espacos_total, nivel_2_espacos_usados, nivel_2_magias,
      nivel_3_espacos_total, nivel_3_espacos_usados, nivel_3_magias,
      nivel_4_espacos_total, nivel_4_espacos_usados, nivel_4_magias,
      nivel_5_espacos_total, nivel_5_espacos_usados, nivel_5_magias,
      nivel_6_espacos_total, nivel_6_espacos_usados, nivel_6_magias,
      nivel_7_espacos_total, nivel_7_espacos_usados, nivel_7_magias,
      nivel_8_espacos_total, nivel_8_espacos_usados, nivel_8_magias,
      nivel_9_espacos_total, nivel_9_espacos_usados, nivel_9_magias
    } = req.body;

    console.log("Dados extraídos:");
    console.log("Classe conjuradora:", classe_conjuradora);
    console.log("Truques:", truques);
    console.log("Nível 1 - Total:", nivel_1_espacos_total, "Usados:", nivel_1_espacos_usados, "Magias:", nivel_1_magias);

    // Verificar se já existem magias para este personagem
    console.log("Verificando se já existem magias...");
    const existingSpells = await pool.query(
      "SELECT id FROM character_spells WHERE character_id = $1",
      [characterId]
    );

    console.log("Magias existentes encontradas:", existingSpells.rows.length);

    let result;
    
    if (existingSpells.rows.length > 0) {
      // Atualizar magias existentes
      console.log("Atualizando magias existentes...");
      
      const updateQuery = `
        UPDATE character_spells SET
          classe_conjuradora = $1,
          cd_resistencia = $2,
          bonus_ataque_magia = $3,
          habilidade_chave = $4,
          truques = $5,
          nivel_1_espacos_total = $6, nivel_1_espacos_usados = $7, nivel_1_magias = $8,
          nivel_2_espacos_total = $9, nivel_2_espacos_usados = $10, nivel_2_magias = $11,
          nivel_3_espacos_total = $12, nivel_3_espacos_usados = $13, nivel_3_magias = $14,
          nivel_4_espacos_total = $15, nivel_4_espacos_usados = $16, nivel_4_magias = $17,
          nivel_5_espacos_total = $18, nivel_5_espacos_usados = $19, nivel_5_magias = $20,
          nivel_6_espacos_total = $21, nivel_6_espacos_usados = $22, nivel_6_magias = $23,
          nivel_7_espacos_total = $24, nivel_7_espacos_usados = $25, nivel_7_magias = $26,
          nivel_8_espacos_total = $27, nivel_8_espacos_usados = $28, nivel_8_magias = $29,
          nivel_9_espacos_total = $30, nivel_9_espacos_usados = $31, nivel_9_magias = $32,
          updated_at = NOW()
        WHERE character_id = $33
        RETURNING id, character_id, updated_at;
      `;

      const values = [
        classe_conjuradora || '',
        cd_resistencia || '',
        bonus_ataque_magia || '',
        habilidade_chave || '',
        JSON.stringify(truques || []),
        nivel_1_espacos_total || 0, nivel_1_espacos_usados || 0, JSON.stringify(nivel_1_magias || []),
        nivel_2_espacos_total || 0, nivel_2_espacos_usados || 0, JSON.stringify(nivel_2_magias || []),
        nivel_3_espacos_total || 0, nivel_3_espacos_usados || 0, JSON.stringify(nivel_3_magias || []),
        nivel_4_espacos_total || 0, nivel_4_espacos_usados || 0, JSON.stringify(nivel_4_magias || []),
        nivel_5_espacos_total || 0, nivel_5_espacos_usados || 0, JSON.stringify(nivel_5_magias || []),
        nivel_6_espacos_total || 0, nivel_6_espacos_usados || 0, JSON.stringify(nivel_6_magias || []),
        nivel_7_espacos_total || 0, nivel_7_espacos_usados || 0, JSON.stringify(nivel_7_magias || []),
        nivel_8_espacos_total || 0, nivel_8_espacos_usados || 0, JSON.stringify(nivel_8_magias || []),
        nivel_9_espacos_total || 0, nivel_9_espacos_usados || 0, JSON.stringify(nivel_9_magias || []),
        characterId
      ];

      console.log("Executando UPDATE com valores:", values.length, "parâmetros");
      result = await pool.query(updateQuery, values);
      console.log("UPDATE executado com sucesso");
    } else {
      // Criar novas magias
      console.log("Criando novas magias...");
      
      const insertQuery = `
        INSERT INTO character_spells (
          character_id,
          classe_conjuradora, cd_resistencia, bonus_ataque_magia, habilidade_chave,
          truques,
          nivel_1_espacos_total, nivel_1_espacos_usados, nivel_1_magias,
          nivel_2_espacos_total, nivel_2_espacos_usados, nivel_2_magias,
          nivel_3_espacos_total, nivel_3_espacos_usados, nivel_3_magias,
          nivel_4_espacos_total, nivel_4_espacos_usados, nivel_4_magias,
          nivel_5_espacos_total, nivel_5_espacos_usados, nivel_5_magias,
          nivel_6_espacos_total, nivel_6_espacos_usados, nivel_6_magias,
          nivel_7_espacos_total, nivel_7_espacos_usados, nivel_7_magias,
          nivel_8_espacos_total, nivel_8_espacos_usados, nivel_8_magias,
          nivel_9_espacos_total, nivel_9_espacos_usados, nivel_9_magias
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33
        ) RETURNING id, character_id, created_at;
      `;

      // Contagem: 1 character_id + 4 info básica + 1 truques + 27 espaços/magias (9 níveis x 3) = 33 total
      const values = [
        characterId, // $1
        classe_conjuradora || '', // $2
        cd_resistencia || '', // $3
        bonus_ataque_magia || '', // $4
        habilidade_chave || '', // $5
        JSON.stringify(truques || []), // $6
        nivel_1_espacos_total || 0, nivel_1_espacos_usados || 0, JSON.stringify(nivel_1_magias || []), // $7, $8, $9
        nivel_2_espacos_total || 0, nivel_2_espacos_usados || 0, JSON.stringify(nivel_2_magias || []), // $10, $11, $12
        nivel_3_espacos_total || 0, nivel_3_espacos_usados || 0, JSON.stringify(nivel_3_magias || []), // $13, $14, $15
        nivel_4_espacos_total || 0, nivel_4_espacos_usados || 0, JSON.stringify(nivel_4_magias || []), // $16, $17, $18
        nivel_5_espacos_total || 0, nivel_5_espacos_usados || 0, JSON.stringify(nivel_5_magias || []), // $19, $20, $21
        nivel_6_espacos_total || 0, nivel_6_espacos_usados || 0, JSON.stringify(nivel_6_magias || []), // $22, $23, $24
        nivel_7_espacos_total || 0, nivel_7_espacos_usados || 0, JSON.stringify(nivel_7_magias || []), // $25, $26, $27
        nivel_8_espacos_total || 0, nivel_8_espacos_usados || 0, JSON.stringify(nivel_8_magias || []), // $28, $29, $30
        nivel_9_espacos_total || 0, nivel_9_espacos_usados || 0, JSON.stringify(nivel_9_magias || [])  // $31, $32, $33
      ];

      console.log("Colunas na query:", 33);
      console.log("Valores fornecidos:", values.length);
      console.log("Executando INSERT...");
      result = await pool.query(insertQuery, values);
      console.log("INSERT executado com sucesso");
    }

    console.log("Magias salvas com sucesso:", result.rows[0]);
    
    res.json({ 
      message: "Magias salvas com sucesso",
      spells: result.rows[0] 
    });
  } catch (error) {
    console.error("ERRO DETALHADO ao salvar magias:");
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    res.status(500).json({ error: "Erro ao salvar magias", details: error.message });
  }
});

// Buscar inventário de um personagem
router.get("/characters/:id/inventory", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== BUSCANDO INVENTÁRIO ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    // Buscar inventário do personagem
    const result = await pool.query(
      "SELECT * FROM character_inventory WHERE character_id = $1",
      [characterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inventário não encontrado" });
    }

    console.log("Inventário encontrado para personagem", characterId);
    res.json({ inventory: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar inventário:", error);
    res.status(500).json({ error: "Erro ao buscar inventário" });
  }
});

// Salvar/Atualizar inventário de um personagem
router.post("/characters/:id/inventory", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const characterId = req.params.id;

  console.log("=== SALVANDO INVENTÁRIO ===");
  console.log("Character ID:", characterId);
  console.log("User ID:", userId);
  console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));

  try {
    // Verificar se o personagem pertence ao usuário
    const ownerCheck = await pool.query(
      "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      console.log("Personagem não encontrado ou não pertence ao usuário");
      return res.status(404).json({ error: "Personagem não encontrado" });
    }

    console.log("Personagem verificado, extraindo dados...");

    const {
      pc, pp, pe, po, pl,
      equipamentos
    } = req.body;

    console.log("Dados extraídos:");
    console.log("Moedas - PC:", pc, "PP:", pp, "PE:", pe, "PO:", po, "PL:", pl);
    console.log("Equipamentos:", equipamentos);

    // Verificar se já existe inventário para este personagem
    console.log("Verificando se já existe inventário...");
    const existingInventory = await pool.query(
      "SELECT id FROM character_inventory WHERE character_id = $1",
      [characterId]
    );

    console.log("Inventário existente encontrado:", existingInventory.rows.length);

    let result;
    
    if (existingInventory.rows.length > 0) {
      // Atualizar inventário existente
      console.log("Atualizando inventário existente...");
      
      const updateQuery = `
        UPDATE character_inventory SET
          pc = $1,
          pp = $2,
          pe = $3,
          po = $4,
          pl = $5,
          equipamentos = $6,
          updated_at = NOW()
        WHERE character_id = $7
        RETURNING id, character_id, updated_at;
      `;

      const values = [
        pc || 0,
        pp || 0,
        pe || 0,
        po || 0,
        pl || 0,
        JSON.stringify(equipamentos || []),
        characterId
      ];

      console.log("Executando UPDATE com valores:", values.length, "parâmetros");
      result = await pool.query(updateQuery, values);
      console.log("UPDATE executado com sucesso");
    } else {
      // Criar novo inventário
      console.log("Criando novo inventário...");
      
      const insertQuery = `
        INSERT INTO character_inventory (
          character_id,
          pc, pp, pe, po, pl,
          equipamentos
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING id, character_id, created_at;
      `;

      const values = [
        characterId,
        pc || 0,
        pp || 0,
        pe || 0,
        po || 0,
        pl || 0,
        JSON.stringify(equipamentos || [])
      ];

      console.log("Colunas na query:", 7);
      console.log("Valores fornecidos:", values.length);
      console.log("Executando INSERT...");
      result = await pool.query(insertQuery, values);
      console.log("INSERT executado com sucesso");
    }

    console.log("Inventário salvo com sucesso:", result.rows[0]);
    
    res.json({ 
      message: "Inventário salvo com sucesso",
      inventory: result.rows[0] 
    });
  } catch (error) {
    console.error("ERRO DETALHADO ao salvar inventário:");
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    res.status(500).json({ error: "Erro ao salvar inventário", details: error.message });
  }
});

module.exports = router;