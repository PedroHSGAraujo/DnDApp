async function verificarAutenticacao() {
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "/";

    const res = await fetch("http://localhost:3000/profile", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) {
        localStorage.removeItem("token");
        return window.location.href = "/";
    }
}
