


const inputFile = document.getElementById('inputFile');
const chooseInputFileButton = document.getElementById('chooseInputFileButton');
const inputFileName = document.getElementById('inputFileName');

const programInput = document.getElementById("programInput");
const programOutput = document.getElementById("programOutput");

const runButton = document.getElementById('runButton');

const inputStream = document.getElementById('inputStream');
const inputStreamButton = document.getElementById('inputStreamButton');


fetch('tests/syntax_presentation.txt')
.then(response => 
{
    if (response.ok == false) 
    {
        throw new Error(`Файл "tests/syntax_presentation.txt" не найден`);
    }
    
    return response.text();
})
.then(text => 
{
    programInput.value = text;
})
.catch(error => 
{
    console.error('Ошибка: ', error);
});

// Ввод текста из файла

chooseInputFileButton.addEventListener('click', function() 
{
    inputFile.click();
});

inputFile.addEventListener('change', function() 
{
    const selectedFile = inputFile.files[0];

    if (selectedFile && selectedFile.name != '') 
    {
        // console.log(selectedFile.name);

        inputFileName.textContent = selectedFile.name;
        load_input(selectedFile); 
    }
});

function load_input (file) 
{
    let fr = new FileReader();

    fr.onload = function () 
    {
        let data = fr.result;
        programInput.value = data;
    };

    fr.readAsText(file);
}

// Исполнене

function clearOutput ()
{
    programOutput.value = "";
    
    inputStream.value = "";
    inputStream.placeholder = "";
}

function addOutput (text)
{
    programOutput.value += text;
}

runButton.addEventListener('click', function() 
{
    run(programInput.value);
});

let lexer;
let tokens;
let parser;
let parse_tree;
let program;

function precision (number, digits = 3)
{
    return Math.trunc(number * Math.pow(10, digits)) / Math.pow(10, digits);
}

function run(input) 
{
    // console.log("Running:\n" + input);
    clearOutput();
    
    // DEBUG
    
    var start = performance.now();
    var a = [], b = [], c = [], n = 100;
    for (let i = 0; i < n; i += 1)
    {
        a.push([]);
        b.push([]);
        c.push([]);
        
        for (let j = 0; j < n; j += 1)
        {
            a[i].push(j * i);
            b[i].push(j + i);
            c[i].push(0);
        }
    }
    var late_start = performance.now();
    for (let i = 0; i < n; i += 1)
    {
        for (let j = 0; j < n; j += 1)
        {
            for (let k = 0; k < n; k += 1)
            {
                c[i][k] += a[i][j] * b[j][k];
            }
        }
    }
    var end = performance.now();
    console.log(`mat_mul (known numbers): ${precision(end - start)}ms, ${precision(end - late_start)}ms`);
    
    var start = performance.now();
    var a = [], b = [], c = [], n = 100;
    for (let i = 0; i < n; i += 1)
    {
        a.push([]);
        b.push([]);
        c.push([]);
        
        for (let j = 0; j < n; j += 1)
        {
            a[i].push(Math.random);
            b[i].push(Math.random);
            c[i].push(0);
        }
    }
    var late_start = performance.now();
    for (let i = 0; i < n; i += 1)
    {
        for (let j = 0; j < n; j += 1)
        {
            for (let k = 0; k < n; k += 1)
            {
                c[i][k] += a[i][j] * b[j][k];
            }
        }
    }
    var end = performance.now();
    console.log(`mat_mul (random numbers): ${precision(end - start)}ms, ${precision(end - late_start)}ms`);
    
    var sm = 0, i = 1, j, n = 1000;
    var start = performance.now();
    for (let i = 1; i <= n; i += 1)
    {
        for (let j = 1; j <= n; j += 1)
        {
            sm += 1 / i / j;
        }
    }
    var end = performance.now();
    console.log(`n = 1000:\nsum: ${sm}\ntime: ${precision(end - start)}ms\n\n`);
    var sm = 0, i = 1, j, n = 10000;
    var start = performance.now();
    for (let i = 1; i <= n; i += 1)
    {
        for (let j = 1; j <= n; j += 1)
        {
            sm += 1 / i / j;
        }
    }
    var end = performance.now();
    console.log(`n = 10000:\nsum: ${sm}\ntime: ${precision(end - start)}ms\n\n`);
    
    // DEBUG

    lexer = new Lexer(input);
    tokens = lexer.get_tokens();

    // console.log(tokens);

    parser = new Parser(tokens);
    parse_tree = parser.parse();

    // console.log(parse_tree);

    program = new Program(parse_tree);
    program.run();


    
    // try
    // {
    //     lexer = new Lexer(input);
    //     tokens = lexer.get_tokens();
    // }
    // catch (error)
    // {
    //     addOutput("Lexical error: " + error.message, true);
    //     return;
    // }
    
    // try
    // {
    //     // console.log(tokens);
        
    //     parser = new Parser(tokens);
    //     parse_tree = parser.parse();
        
    //     // console.log(parse_tree);
        
    //     program = new Program(parse_tree);
    // }
    // catch (error)
    // {
    //     addOutput("Semantic error: " + error.message, true);
    //     return;
    // }
    
    // try
    // {
    //     program.run();
    // }
    // catch (error)
    // {
    //     addOutput("Runtime error: " + error.message, true);
    //     return;
    // }

    // console.log(`time: ${Math.round(program.overall_time * 1000) / 1000}ms`);
}