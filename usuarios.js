const usuarios = [
    { id: 1, nome: "paulo" }, 
    { id: 2, nome: "joao" }, 
    { id: 3, nome: "maria" }
]

function ListarUsuarios() {
    return usuarios
}

function BuscarPorId(id) {
    return usuarios.find(u => u.id === id)
}

function AdicionarUsuario(usuario) {
    usuarios.push(usuario)
    return usuario
}

module.exports = { ListarUsuarios, BuscarPorId, AdicionarUsuario }