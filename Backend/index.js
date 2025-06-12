require("dotenv").config();
const db = require("./db");
const express = require("express");
const app = express();

const authMiddleware = require("./authMiddleware");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const characterRoutes = require('./characters')

const cors = require('cors');
const cors = require('cors');

app.use(cors({
  origin: [
    'https://dndapp-0f3t.onrender.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://fichadnd.com.br',
    'https://www.fichadnd.com.br'
  ],
  credentials: true
}));

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(characterRoutes);

//CRUD de usuarios

app.get("/users", async (req, res) => {
    try {
        const users = await db.selectUsers();
        res.json(users);
    } catch (err) {
        console.error("Erro ao buscar usuários:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.get("/users/:username", async (req, res) => {
    try {
        const user = await db.selectUser(req.params.username);
        if (user.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json(user);
    } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.post("/register", async (req, res) => {
    try {
        await db.insertUser(req.body);
        res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (err) {
        console.error("Erro ao criar usuário:", err);

        if (err.message === "DUPLICATE_ENTRY") {
            return res.status(409).json({ error: "Usuário ou e-mail já cadastrado" });
        }

        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.patch("/users/:username", async (req, res) => {
    try {
        await db.updateUser(req.params.username, req.body);
        res.status(200).json({ message: "Usuário atualizado com sucesso" });
    } catch (err) {
        console.error("Erro ao atualizar usuário:", err);

        if (err.code === '23505') {
            return res.status(409).json({ error: "Usuário já existe" });
        }

        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.delete("/users/:username", async (req, res) => {
    try {
        await db.deleteUser(req.params.username);
        res.status(204).json({ message: "Usuário deletado com sucesso" });
    } catch (err) {
        console.error("Erro ao deletar usuário:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

//Verica se o usuário existe na tabela users (necessário pro login)

app.get("/check-user", async (req, res) => {
    try {
        const { username, email } = req.query;

        const result = await db.selectUserByUsernameOrEmail(username, email);

        if (result.length > 0) {
            res.status(200).json({ exists: true });
        } else {
            res.status(200).json({ exists: false });
        }
    } catch (err) {
        console.error("Erro ao verificar usuário/email:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

//Fazer login

app.post("/login", async (req, res) => {
    const { username, senha } = req.body;

    try {
        const users = await db.selectUser(username);
        const user = users[0];

        if (!user) {
            return res.status(400).json({ error: "Usuário não encontrado" });
        }

        const senhaCorreta = await bcrypt.compare(senha, user.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ error: "Senha incorreta" });
        }

        //Gera token de autenticação
        const token = jwt.sign(
            { id: user.id, username: user.username }, //Payload do token
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token });
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

//Pagina de perfil com informações do usuário logado previamente

app.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await db.selectUser(req.user.username);
        res.json({ user: user[0] });
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
});

//Atualizar username ou e-mail

app.put("/profile", authMiddleware, async (req, res) => {
    const username = req.user.username;
    const novoUsuario = req.body;

    try {
        await db.updateUser(username, novoUsuario);

        // Gera novo token (caso o username tenha mudado)
        const token = jwt.sign(
            { id: req.user.id, username: novoUsuario.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ message: "Perfil atualizado com sucesso", token });
    } catch (err) {
        if (err.message === "DUPLICATE_ENTRY") {
            return res.status(409).json({ error: "Usuário ou e-mail já em uso" });
        }

        console.error(err);
        return res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
});

//Atualizar senha

app.put("/update-password", authMiddleware, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const username = req.user.username;

    try {
        const user = (await db.selectUser(username))[0];
        const isMatch = await bcrypt.compare(senhaAtual, user.senha);
        if (!isMatch) return res.status(400).json({ error: "Senha atual incorreta" });

        await db.updatePassword(username, novaSenha);
        res.json({ message: "Senha atualizada com sucesso" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao atualizar a senha" });
    }
});

//Ver personagens

app.get("/visualizar-personagem", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "visualizar-personagem.html"));
});

//Editar personagem

app.get("/editar-personagem", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "editar-personagem.html"));
});

app.post("/verify-password", authMiddleware, async (req, res) => {
    const { senha } = req.body;
    const username = req.user.username;

    console.log("=== VERIFICANDO SENHA ===");
    console.log("Username:", username);
    console.log("Senha recebida:", senha ? "***" : "vazia");

    if (!senha) {
        console.log("Erro: Senha não fornecida");
        return res.status(400).json({ error: "Senha é obrigatória" });
    }

    try {
        const users = await db.selectUser(username);
        const user = users[0];

        if (!user) {
            console.log("Erro: Usuário não encontrado");
            return res.status(400).json({ error: "Usuário não encontrado" });
        }

        console.log("Usuário encontrado, verificando senha...");
        const senhaCorreta = await bcrypt.compare(senha, user.senha);

        if (!senhaCorreta) {
            console.log("Senha incorreta");
            return res.status(401).json({ error: "Senha incorreta" });
        }

        console.log("Senha verificada com sucesso");
        res.json({ message: "Senha verificada com sucesso" });
    } catch (err) {
        console.error("Erro na verificação de senha:", err);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

//Rotas para o frontend

const path = require("path");

app.use(express.static(path.join(__dirname, "Pages")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "personagens.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "index.html"));
});

app.get("/personagens", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "personagens.html"));
});

app.get("/jogador", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "jogador.html"));
});

app.get("/atributos", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "atributos.html"));
});

app.get("/habilidades", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "habilidades.html"));
});

app.get("/magias", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "magias.html"));
});

app.get("/inventario", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "inventario.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "register.html"));
});

app.get("/novo-personagem", (req, res) => {
    res.sendFile(path.join(__dirname, "Pages", "novo-personagem.html"))
});

//Informe de porta

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
