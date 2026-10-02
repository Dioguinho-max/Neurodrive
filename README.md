# NeuroDrive 

Simulador 3D de carros autônomos com **neuroevolução** e visualização interativa de redes neurais. Acompanhe os carros em um circuito com curvas e retas, observe suas decisões e pause para entender os cálculos de cada neurônio.

O projeto roda no navegador, com HTML, CSS e JavaScript. Não precisa de instalação de pacotes, compilação ou backend.

## Recursos

- População configurável de **1 a 100 carros**.
- Circuito de aproximadamente **980 metros** na escala da simulação, com curvas em S, zebras e barreiras.
- Carros 3D com rodas direcionais e luzes de freio.
- Câmeras de visão geral, orbital e terceira pessoa, com seleção do carro acompanhado.
- Cinco sensores de distância e uma entrada de velocidade por carro.
- Rede neural visível com ativações, contribuições das conexões e indicadores de direção e pedal.
- Inspeção de entradas, pesos, viés e função de ativação de cada neurônio.
- Treinamento em **1×, 4× ou 12×**, pausa e avanço de um passo.
- Indicadores de geração, carros ativos, melhor percurso e voltas completas.
- Visualização 2D alternativa quando o 3D não pode ser inicializado.

## Como executar

Clone o repositório:

```bash
git clone https://github.com/Dioguinho-max/neurodrive.git
cd neurodrive
```

Abra **[output/neuro-pista.html](output/neuro-pista.html)** em um navegador atualizado. A biblioteca Three.js está incluída no projeto, permitindo executar a simulação localmente, sem internet.

Para a visualização 3D, o navegador precisa oferecer suporte a WebGL. Node.js é necessário apenas para executar os testes.

Se preferir usar um servidor local e tiver Python instalado, execute na raiz do repositório:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Depois, acesse `http://127.0.0.1:8000/output/neuro-pista.html`.

## Como usar

1. Clique em **Iniciar treinamento** para colocar os carros em movimento.
2. Para mudar a população, informe a **Quantidade de carros** e clique em **Aplicar e reiniciar**. Isso reinicia a geração e os resultados do treinamento.
3. Escolha a velocidade de simulação: **1×**, **4×** ou **12×**.
4. Em **Câmera**, selecione **Terceira pessoa** para acompanhar o carro por trás. Em **Carro acompanhado**, escolha um carro específico ou o líder automático.
5. Arraste a vista 3D para girar e use a roda do mouse ou os botões **+** e **−** para ajustar o zoom.
6. Clique em um neurônio oculto ou de saída, ou use **Inspecionar neurônio**, para pausar e conferir seu cálculo.
7. Use **Avançar um passo** para observar a próxima decisão.

A rede neural e os sensores exibidos pertencem ao **líder**, mesmo quando a câmera acompanha outro carro. A direção desejada pela rede pode diferir do volante aplicado, pois a simulação suaviza os movimentos da direção.

## Como a IA funciona

Cada carro tem uma rede neural com arquitetura **6 → 6 → 2**:

| Camada | Função |
| --- | --- |
| 6 entradas | Cinco distâncias até as bordas da pista e a velocidade normalizada |
| 6 neurônios ocultos | Combinam as entradas usando pesos, viés e ativação `tanh` |
| 2 saídas | Direção e pedal: acelerar ou frear |

São **48 conexões e 8 vieses**, totalizando 56 parâmetros ajustáveis. O cálculo de cada neurônio é:

```text
z = soma(entrada × peso) + viés
saída = tanh(z)
```

As entradas variam de 0 a 1. Os sensores alcançam até 40 metros na escala da simulação. As ativações ocultas e as saídas variam de −1 a +1.

O treinamento usa **seleção e mutação**: os carros são classificados pelo progresso ao longo da pista; redes entre as melhores são copiadas e seus pesos recebem pequenas alterações para formar a próxima geração. A seleção se adapta ao tamanho da população.

As redes começam com **pesos iniciais orientados a procurar espaço livre e reduzir a velocidade diante de obstáculos**, acrescidos de pequenas variações aleatórias. Isso reduz as colisões na largada; o comportamento inicial não é aprendido inteiramente do zero. A neuroevolução continua ajustando esses pesos durante a execução.

O controlador usa os sensores e a velocidade. A geometria do circuito serve para detectar bordas, medir progresso e desenhar a pista, sem comandar diretamente a direção do carro.

## Estrutura do projeto

```text
neurodrive/
├── README.md
└── output/
    ├── neuro-pista.html        # Estrutura e controles da interface
    ├── neuro-pista.css         # Estilos, temas e layout responsivo
    ├── neuro-pista.js          # Rede neural, evolução, física e interface
    ├── neuro-pista-track.js    # Traçado compartilhado pela física e renderização
    ├── neuro-pista-3d.js       # Modelos dos carros, cenário e câmeras
    ├── tests/
    │   ├── driving.cjs        # Teste do comportamento dos carros
    │   └── smoke.cjs          # Testes de integração e controles
    └── vendor/
        ├── three.min.js       # Three.js r160
        └── THREE-LICENSE.txt  # Licença da biblioteca
```

## Testes

Com Node.js instalado, execute na raiz do projeto:

```bash
node output/tests/driving.cjs
node output/tests/smoke.cjs
```

- **`driving.cjs`** verifica sobrevivência inicial, conclusão de volta e valores válidos de velocidade e direção.
- **`smoke.cjs`** verifica integração dos modelos, controles, inspeção dos neurônios, tamanhos de população, câmeras e alternativa 2D.

Os testes de integração substituem o DOM e o renderizador WebGL por objetos de teste, mantendo a geometria do Three.js. Eles não substituem uma conferência visual em um navegador com GPU.

## Escopo da simulação

O NeuroDrive é um projeto educativo. Os carros são avaliados individualmente e podem se sobrepor; não há colisões entre veículos. A física é simplificada e os modelos 3D são construídos com formas geométricas.

O treinamento fica em memória: recarregar a página reinicia a população. Populações maiores e velocidades de simulação elevadas exigem mais processamento.

## Dependência e licença

O projeto inclui o Three.js r160. Sua licença MIT está preservada em **[output/vendor/THREE-LICENSE.txt](output/vendor/THREE-LICENSE.txt)**.

Essa licença se refere à biblioteca Three.js. Uma licença própria para o código do NeuroDrive ainda não foi definida neste repositório.
