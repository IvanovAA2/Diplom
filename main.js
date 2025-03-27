


const inputFile = document.getElementById('inputFile');
const chooseInputFileButton = document.getElementById('chooseInputFileButton');
const inputFileName = document.getElementById('inputFileName');

const programInput = document.getElementById("programInput");
const programOutput = document.getElementById("programOutput");

const runButton = document.getElementById('runButton');

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

function load_input(file) 
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

function clearOutput()
{
    programOutput.value = "";
}

function addOutput(text, new_line = false)
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

function run(input) 
{
    

    console.log("Running:\n" + input);
    clearOutput();

    var lexer;
    var tokens;
    var parser;
    var parse_tree;
    var program;

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
}