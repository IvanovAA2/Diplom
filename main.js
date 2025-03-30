


const inputFile = document.getElementById('inputFile');
const chooseInputFileButton = document.getElementById('chooseInputFileButton');
const inputFileName = document.getElementById('inputFileName');

const programInput = document.getElementById("programInput");
const programOutput = document.getElementById("programOutput");

const runButton = document.getElementById('runButton');

const inputStream = document.getElementById('inputStream');
const inputStreamButton = document.getElementById('inputStreamButton');

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
        console.log(selectedFile.name);

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

function addOutput (text, new_line = false)
{
    programOutput.value += text;
    if (new_line) 
    {
        programOutput.value += "\n";
    }
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

function wait_for_input (text)
{
    inputStream.disabled = false;
    inputStreamButton.disabled = false;

    inputStream.placeholder = text;
}

inputStreamButton.addEventListener('click', function() 
{
    inputStream.disabled = true;
    inputStreamButton.disabled = true;

    program.run();
});

function get_input ()
{
    return inputStream.value;
}

function run(input) 
{
    // var sm = 0, i = 1, j, n = 1000;
    // var start = performance.now();
    // for (var i = 1; i <= n; i += 1)
    // {
    //     for (var j = 1; j <= n; j += 1)
    //     {
    //         sm += 1 / (i * j);
    //     }
    // }
    // console.log(sm);
    // console.log(performance.now() - start);

    console.log("Running:\n" + input);
    clearOutput();

    // lexer = new Lexer(input);
    // tokens = lexer.get_tokens();

    // console.log(tokens);

    // parser = new Parser(tokens);
    // parse_tree = parser.parse();

    // console.log(parse_tree);

    // program = new Program(parse_tree);
    // program.run();
    
    try
    {
        lexer = new Lexer(input);
        tokens = lexer.get_tokens();
    }
    catch (error)
    {
        addOutput("Lexical error: " + error.message, true);
        return;
    }
    
    try
    {
        console.log(tokens);
        
        parser = new Parser(tokens);
        parse_tree = parser.parse();
        
        console.log(parse_tree);
        
        program = new Program(parse_tree);
    }
    catch (error)
    {
        addOutput("Semantic error: " + error.message, true);
        return;
    }
    
    try
    {
        program.run();
    }
    catch (error)
    {
        addOutput("Runtime error: " + error.message, true);
        return;
    }

    console.log(`time: ${Math.round(program.overall_time * 1000) / 1000}ms`);
}