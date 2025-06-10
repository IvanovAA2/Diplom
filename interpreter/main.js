


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

    program.return_value = new Data(
        Data.TYPEOF.string, 
        get_input()
    );
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
    console.log("Running");
    clearOutput();
    
    // new line
    
    // lexer = new Lexer(input);
    // tokens = lexer.get_tokens();

    // // console.log(tokens);

    // parser = new Parser(tokens);
    // parse_tree = parser.parse();

    // // console.log(parse_tree);

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
        // console.log(tokens);
        
        parser = new Parser(tokens);
        parse_tree = parser.parse();
        
        // console.log(parse_tree);
        
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

    // console.log(`time: ${Math.round(program.overall_time * 1000) / 1000}ms`);
}