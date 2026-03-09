import { memo } from 'react';

export const SetorDatas = memo(({ nome, planejadoInicio, planejadoFim, realizadoInicio, realizadoFim }: {
    nome: string;
    planejadoInicio?: string;
    planejadoFim?: string;
    realizadoInicio?: string;
    realizadoFim?: string;
}) => {
    const hasData = planejadoInicio || planejadoFim || realizadoInicio || realizadoFim;
    if (!hasData) return null;

    return (
        <div className="bg-white rounded-lg p-2 border border-gray-100 dark:bg-card dark:border-border">
            <div className="text-xs font-semibold text-primary mb-1">{nome}</div>
            <div className="grid grid-cols-2 gap-x-3 text-[10px]">
                {(planejadoInicio || planejadoFim) && (
                    <>
                        <div className="text-gray-400">Planejado:</div>
                        <div className="text-gray-600 dark:text-gray-400">{planejadoInicio || '-'} a {planejadoFim || '-'}</div>
                    </>
                )}
                {(realizadoInicio || realizadoFim) && (
                    <>
                        <div className="text-gray-400">Realizado:</div>
                        <div className="text-gray-600 dark:text-gray-300 font-medium">{realizadoInicio || '-'} a {realizadoFim || '-'}</div>
                    </>
                )}
            </div>
        </div>
    );
});
