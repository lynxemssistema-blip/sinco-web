const fs = require('fs');
const path = require('path');

const uiFile = path.join(__dirname, '../frontend/src/pages/Projeto.tsx');
let code = fs.readFileSync(uiFile, 'utf8');

// 1. Modificar verificação do botão Liberar:
// De: {projeto.liberado !== 'S' && (
// Para: {(!projeto.liberado || projeto.liberado.trim() === '') && (

code = code.replace(
    "{projeto.liberado !== 'S' && (",
    "{(!projeto.liberado || projeto.liberado.trim() === '') && ("
);

// 2. Modificar Formatação de Data, no submit, não precisamos alterar pois o React usa YYYY-MM-DD nativamente nos inputs type=date, e o Backend agora recebe e converte usando formatBR().
// Mas no onSubmit podemos garantir as mensagens:
// "Informe Projeto !"
// "Informe Responsavel pelo Projeto !"
// "Selecione Cliente!"
// "Informe descrição Projeto !"
const oldSubmit = `    const handleProjetoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);`;

const newSubmit = `    const handleProjetoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Front-end validations similar to VB.NET
        if (!projetoFormData.Projeto) {
             showAlert("Informe Projeto !", "error");
             return;
        }
        if (!projetoFormData.Responsavel) {
             showAlert("Informe Responsavel pelo Projeto !", "error");
             return;
        }
        if (!projetoFormData.ClienteProjeto) {
             showAlert("Selecione Cliente!", "error");
             return;
        }
        if (!projetoFormData.Descricao) {
             showAlert("Informe descrição Projeto !", "error");
             return;
        }
        if (!projetoFormData.PrazoEntrega || isNaN(Number(projetoFormData.PrazoEntrega))) {
             showAlert("Informe número de dias para entrega do Projeto!", "error");
             return;
        }

        setSaving(true);
        setError(null);`;

code = code.replace(oldSubmit, newSubmit);

fs.writeFileSync(uiFile, code, 'utf8');
console.log('Projeto.tsx atualizado com validações front-end e regra do botão liberar.');
