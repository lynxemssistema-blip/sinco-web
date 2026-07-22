Write-Host "Iniciando processo de deploy para o Easypanel..."

# 1. Build do Frontend
Write-Host "Construindo o Frontend..."
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao construir o frontend."
    exit $LASTEXITCODE
}
Set-Location ..

# 2. Limpar pasta antiga para evitar lixo
Write-Host "Limpando PublicacaoSite antigo..."
Remove-Item -Path "PublicacaoSite\assets" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Copiar Frontend
Write-Host "Copiando build do Frontend..."
Copy-Item -Path "frontend\dist\*" -Destination "PublicacaoSite" -Recurse -Force
Copy-Item -Path "public\landing.html" -Destination "PublicacaoSite" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "login_inicial.html" -Destination "PublicacaoSite" -Force -ErrorAction SilentlyContinue

# 4. Copiar Backend
Write-Host "Copiando arquivos do Backend..."
Copy-Item -Path "src\*" -Destination "PublicacaoSite\src" -Recurse -Force

# 5. Commit e Push
Write-Host "Enviando atualizações para o GitHub (sinco-web e publicarsincoweb)..."
git add PublicacaoSite/
git commit -m "chore: atualiza pasta PublicacaoSite com a ultima versao para o Easypanel"
git push origin main
git push deployrepo main --force

Write-Host "Deploy finalizado com sucesso! O Easypanel iniciará a atualização em instantes."
