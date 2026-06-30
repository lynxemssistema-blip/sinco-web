$files = Get-ChildItem -Path frontend\src\pages -Filter "*.tsx" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Substituir os paddings mais comuns de grids
    $newContent = $content -replace 'px-4 py-4', 'px-2 py-1'
    $newContent = $newContent -replace 'px-4 py-3', 'px-2 py-1'
    $newContent = $newContent -replace 'px-4 py-2', 'px-2 py-1'
    $newContent = $newContent -replace 'px-3 py-2', 'px-2 py-1'
    $newContent = $newContent -replace 'px-3 py-1.5', 'px-2 py-0.5'
    
    # Reduzir text-sm para text-[11px] em classes textuais comuns dentro de <p>, <span>, <div> e <td>
    # Aqui vou ser mais agressivo com paddings, e tentar reduzir a fonte apenas quando tem font-medium text-[#32423D] text-sm
    $newContent = $newContent -replace 'text-sm', 'text-xs'
    
    # Diminuir icones de 16 pra 14 em aoes comuns
    $newContent = $newContent -replace 'size=\{16\}', 'size={14}'
    $newContent = $newContent -replace 'size=\{18\}', 'size={15}'

    if ($newContent -cne $content) {
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Atualizado: $($file.Name)"
    }
}
