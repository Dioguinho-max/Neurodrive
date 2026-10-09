# Pit stops

Nas corridas de **5 voltas ou mais**, os pneus perdem aderência gradualmente com o uso. A classificação e as provas curtas mantêm os pneus sem desgaste.

A durabilidade foi reduzida: o desgaste básico é de aproximadamente 28% por volta, com desgaste adicional por derrapagens, frenagens e grama. Abaixo de 30% aparece o aviso de aderência reduzida; a 10% o alerta é crítico. Ao chegar a **0%**, um pneu estoura. O carro perde muita aderência, puxa para um lado e só consegue seguir lentamente. A roda danificada aparece deformada. Não há som novo de pneus.

Use os boxes antes desse limite. A troca restaura os pneus e elimina o estouro. Reposicionar com R não repara os pneus. A IA antecipa suas paradas, e o online usa a mesma física e desgaste do solo.

- Pressione **B** ou toque em **Chamar boxes** para solicitar a próxima parada. Use novamente para cancelar antes da entrada.
- A entrada fica logo após a linha de largada. Se já passou dela, complete mais uma volta.
- A partir da entrada, o piloto automático conduz a 60 km/h até a área de atendimento.
- A equipe levanta o carro e troca as quatro rodas em **8 segundos**. O tempo continua contando na corrida.
- Após a saída dos boxes, você retoma o controle. Os adversários também param quando precisam.
- No online, o servidor controla o desgaste, a parada e a reposição dos pneus. Salas comuns aceitam até 10 voltas; a Copa Neuro continua com 3.

Validação da mecânica: `node output/tests/pit-stop.cjs`.
Validação do modelo e da animação: `node output/tests/skins.cjs`.
