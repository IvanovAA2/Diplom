


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
    var fr = new FileReader();

    fr.onload = function () 
    {
        var data = fr.result;
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

var lexer;
var tokens;
var parser;
var parse_tree;
var program;

function await_input (text)
{
    inputStream.disabled = false;
    inputStreamButton.disabled = false;

    inputStream.placeholder = text;
}

inputStreamButton.addEventListener('click', function() 
{
    inputStream.disabled = true;
    inputStreamButton.disabled = true;

    program.run(false);
});

function get_input ()
{
    const text = inputStream.value;

    inputStream.value = "";
    inputStream.placeholder = "";

    return text;
}

function precision (number, digits = 3)
{
    return Math.trunc(number * Math.pow(10, digits)) / Math.pow(10, digits);
}

function run(input) 
{
    // console.log("Running:\n" + input);
    clearOutput();
    
    
    // var start = performance.now();
    // var a = [], b = [], c = [], n = 100;
    // for (var i = 0; i < n; i += 1)
    // {
    //     a.push([]);
    //     b.push([]);
    //     c.push([]);
        
    //     for (var j = 0; j < n; j += 1)
    //     {
    //         a[i].push(Math.random);
    //         b[i].push(Math.random);
    //         c[i].push(0);
    //     }
    // }
    // for (var i = 0; i < n; i += 1)
    // {
    //     for (var j = 0; j < n; j += 1)
    //     {
    //         for (var k = 0; k < n; k += 1)
    //         {
    //             c[i][k] += a[i][j] * b[j][k];
    //         }
    //     }
    // }
    // console.log(precision(performance.now() - start));
    
    // var sm = 0, i = 1, j, n = 1000;
    // var start = performance.now();
    // for (var i = 1; i <= n; i += 1)
    // {
    //     for (var j = 1; j <= n; j += 1)
    //     {
    //         sm += 1 / i / j;
    //     }
    // }
    // addOutput(`n = 1000:\nsum: ${sm}\ntime: ${precision(performance.now() - start)}ms\n\n`);
    // var sm = 0, i = 1, j, n = 10000;
    // var start = performance.now();
    // for (var i = 1; i <= n; i += 1)
    // {
    //     for (var j = 1; j <= n; j += 1)
    //     {
    //         sm += 1 / i / j;
    //     }
    // }
    // addOutput(`n = 10000:\nsum: ${sm}\ntime: ${precision(performance.now() - start)}ms\n\n`);


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