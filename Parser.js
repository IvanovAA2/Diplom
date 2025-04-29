const NOP = "NOP";

class Node
{
    rule_name;
    children = null;

    constructor (RULE_NAME)
    {
        this.rule_name = RULE_NAME;
    }

    add_child (child)
    {
        if (child !== null) 
        {
            if (this.children === null) 
            {
                this.children = [child];
            }
            else 
            {
                this.children.push(child);
            }
        }
    }
}

class Parser
{
    #tokens;
    #position;

    constructor(tokens)
    {
        this.#tokens    = tokens;
        this.#position  = 0;

        if (Parser.#ast === null) 
        {
            Parser.#ast = new Map();

            for (const RULE_NAME in Parser.#syntax_rules) 
            {
                Parser.#build_ast(RULE_NAME);
            }

            console.log(Parser.#ast);
        }
    }

    static #syntax_rules = 
    {
        Program : 
        [
            ["Statements", EOF],
            [EOF],
        ],
        Statements : 
        [
            ["Statement", "Statements"],
            [NOP],
        ],
        Statement :
        [
            ["Expressions"],
            ["Declaration", ";"],
            ["Scope"],
            ["Conditional"],
            ["Loop"],

            ["Function"],

            ["FlowControl"],
        ],
        Scope :
        [
            ["{", "Statements", "}"],
        ],

        Function :
        [
            ["func", "id", "(", "FunctionParameters", ")", "Scope"],
        ],
        FunctionParameters :
        [
            ["FunctionParameter", "$FunctionParameters"],
            [NOP],
        ],
        $FunctionParameters :
        [
            [",", "FunctionParameter", "$FunctionParameters"],
            [NOP],
        ],
        FunctionParameter :
        [
            ["id", "$FunctionParameter"],
        ],
        $FunctionParameter :
        [
            ["=", "Expression"],
            [NOP],
        ],

        BoolExpression :
        [
            ["Expression"],
        ],

        Conditional :
        [
            ["IfBlock", "$ElifBlock"],
        ],
        $ElifBlock :
        [
            ["ElifBlock", "$ElifBlock"],
            ["ElseBlock"],
        ],
        IfBlock :
        [
            ["if", "(", "BoolExpression", ")", "Scope"],
        ],
        ElifBlock :
        [
            ["elif", "(", "BoolExpression", ")", "Scope"],
        ],
        ElseBlock :
        [
            ["else", "Scope"],
            [NOP],
        ],

        Loop : 
        [
            ["For"],
            ["While"],
        ],
        While :
        [
            ["while", "(", "BoolExpression", ")", "Scope"],
        ],
        For :
        [
            ["for", "(", "ExpressionOrDeclaration", ";", "BoolExpression", ";", "Expression", ")", "Scope"],
        ],
        ExpressionOrDeclaration :
        [
            ["Expression"],
            ["Declaration"],
        ],
        FlowControl :
        [
            ["continue", ";"],
            ["break", ";"],
            ["return", "$Expression", ";"],
        ],

        Declaration :
        [
            ["var", "SingleDeclaration", "$Declaration"],
        ],
        $Declaration :
        [
            [",", "SingleDeclaration", "$Declaration"],
            [NOP],
        ],
        SingleDeclaration :
        [
            ["id", "$SingleDeclaration"],
        ],
        $SingleDeclaration :
        [
            ["=", "Expression"],
            [NOP],
        ],

        Expressions :
        [
            ["Expression", "$Expressions"],
            [";"],
        ],
        $Expressions :
        [
            [",", "Expression", "$Expressions"],
            [";"],
        ],
        Expression :
        [
            ["AssignOp"],
        ],
        $Expression :
        [
            ["Expression"],
            [NOP],
        ],

        AssignOp :
        [
            ["BoolOr", "$AssignOp"],
        ],
        $AssignOp :
        [
            ["=", "BoolOr"],
            ["+=", "BoolOr"],
            ["-=", "BoolOr"],
            ["*=", "BoolOr"],
            ["/=", "BoolOr"],
            ["//=", "BoolOr"],
            [NOP],
        ],

        BoolOr :
        [
            ["BoolAnd", "$BoolOr"],
        ],
        $BoolOr :
        [
            ["or", "BoolAnd", "$BoolOr"], 
            [NOP],
        ],

        BoolAnd :
        [
            ["BitOr", "$BoolAnd"],
        ],
        $BoolAnd :
        [
            ["and", "BitOr", "$BoolAnd"], 
            [NOP],
        ],

        BitOr :
        [
            ["BitXor", "$BitOr"],
        ],
        $BitOr :
        [
            ["|", "BitXor", "$BitOr"], 
            [NOP],
        ],
        BitXor :
        [
            ["BitAnd", "$BitXor"],
        ],
        $BitXor :
        [
            ["^", "BitAnd", "$BitXor"], 
            [NOP],
        ],
        BitAnd :
        [
            ["EqualOp", "$BitAnd"],
        ],
        $BitAnd :
        [
            ["&", "EqualOp", "$BitAnd"], 
            [NOP],
        ],

        EqualOp :
        [
            ["CompOp", "$EqualOp"]
        ],
        $EqualOp :
        [
            ["==", "CompOp", "$EqualOp"],
            ["!=", "CompOp", "$EqualOp"],
            ["===", "CompOp", "$EqualOp"],
            ["!==", "CompOp", "$EqualOp"],
            [NOP],
        ],

        CompOp :
        [
            ["AddOp", "$CompOp"],
        ],
        $CompOp :
        [
            ["<", "AddOp", "$CompOp"],
            [">", "AddOp", "$CompOp"],
            ["<=", "AddOp", "$CompOp"],
            [">=", "AddOp", "$CompOp"],
            [NOP],
        ],

        AddOp :
        [
            ["MulOp", "$AddOp"],
        ],
        $AddOp :
        [
            ["+", "MulOp", "$AddOp"],
            ["-", "MulOp", "$AddOp"],
            [NOP],
        ],

        MulOp :
        [
            ["$Value", "$MulOp"],
        ],
        $MulOp :
        [
            ["*", "$Value", "$MulOp"],
            ["/", "$Value", "$MulOp"],
            ["//", "$Value", "$MulOp"],
            ["%", "$Value", "$MulOp"],
            [NOP],
        ],
        
        

        $Value :
        [
            ["Value", "Accessing"],
            ["UnaryOp"],
        ],
        UnaryOp :
        [
            ["-", "$Value"],
            ["not", "$Value"],
        ],
        Accessing :
        [
            ["SingleAccessing", "Accessing"],
            [NOP],
        ],
        SingleAccessing :
        [
            ["[", "Expression", "Slice", "]"],
            [".", "MemberAccessing"],
        ],
        Slice :
        [
            [":", "Expression"],
            [NOP],
        ],
        MemberAccessing :
        [
            ["len"],
            ["push",        "(", "Expression", ")"],
            ["pop",         "(", ")"],
            ["split",       "(", "Expression", ")"],
            ["join",        "(", "Expression", ")"],
            ["codeOfChar",  "(", "Expression", ")"],
        ],

        Value :
        [
            ["(", "Expression", ")"],

            ["Null"],
            ["Boolean"],
            ["Number"],
            ["String"],
            ["Array"],

            ["VariableOrFunctionCall"],
            ["DefaultFunctionCall"],
        ],

        VariableOrFunctionCall :
        [
            ["id", "FunctionCall"],
        ],
        FunctionCall :
        [
            ["(", "ReverseParameters", ")"],
            [NOP],
        ],
        DefaultFunctionCall :
        [
            ["isNull",      "(", "Expression", ")"],
            ["isBool",      "(", "Expression", ")"],
            ["isNumber",    "(", "Expression", ")"],
            ["isString",    "(", "Expression", ")"],
            ["isArray",     "(", "Expression", ")"],
            
            ["print",       "(", "Parameters", ")"],
            ["input",       "(", "$Expression", ")"],
            ["format",      "(", "Expression", ")"],
            ["clone",       "(", "Expression", ")"],
        ],

        Parameters :
        [
            ["Expression", "$Parameters"],
            [NOP],
        ],
        $Parameters :
        [
            [",", "Expression", "$Parameters"],
            [NOP],
        ],
        ReverseParameters :
        [
            ["Expression", "$ReverseParameters"],
            [NOP],
        ],
        $ReverseParameters :
        [
            [",", "Expression", "$ReverseParameters"],
            [NOP],
        ],

        Null :
        [
            ["null"],
        ],
        Boolean :
        [
            ["true"],
            ["false"],

            ["bool", "(", "Expression", ")"],
        ],
        Number :
        [
            ["numberToken"],

            ["number", "(", "Expression", ")"],
        ],
        String :
        [
            ["stringToken"],

            ["string", "(", "Expression", ")"],
        ],
        Array :
        [
            ["[", "$Array", "]"],
        ],
        $Array :
        [
            ["Expression", "$$Array"],
            [NOP],
        ],
        $$Array :
        [
            [",", "Expression", "$$Array"],
            [NOP],
        ],
    }
    static #ast = null;

    static #is_terminal(RULE_NAME) 
    {
        return Lexer.tokens.has(RULE_NAME) 
            || Lexer.keywords.has(RULE_NAME) 
            || RULE_NAME === EOF;
    }

    static #build_ast(RULE_NAME)
    {
        if (RULE_NAME === NOP || Parser.#is_terminal(RULE_NAME)) 
        {
            return new Set([RULE_NAME]);
        }
        if (Parser.#ast.has(RULE_NAME) === false) 
        {
            const CURRENT_RULE = Parser.#syntax_rules[RULE_NAME];
            Parser.#ast.set(RULE_NAME, new Map());

            for (const VARIANT in CURRENT_RULE) 
            {
                const FIRST_TOKENS = Parser.#build_ast(CURRENT_RULE[VARIANT][0]);
                
                for (const TOKEN of FIRST_TOKENS) 
                {
                    const CURRENT_AST_RULE = Parser.#ast.get(RULE_NAME);

                    if (CURRENT_AST_RULE.has(TOKEN)) 
                    {
                        throw new Error(`in "${RULE_NAME}" "${TOKEN}" occured in ` +
                            `"${CURRENT_RULE[CURRENT_AST_RULE.get(TOKEN)][0]}" ` +
                            `and "${CURRENT_RULE[VARIANT][0]}"`);
                    }
                    CURRENT_AST_RULE.set(TOKEN, VARIANT);
                }
            }
        }

        return new Set(Parser.#ast.get(RULE_NAME).keys());
    }

    #current_token ()
    {
        return this.#tokens[this.#position];
    }
    
    #get_parse_tree (RULE_NAME)
    {
        var node = new Node(RULE_NAME);

        if (Parser.#is_terminal(RULE_NAME)) 
        {
            if (RULE_NAME != this.#current_token().type)
            {
                console.log(RULE_NAME);
                throw new Error(`can't match token "${this.#current_token().type}" at ` + 
                `(${this.#current_token().position.row}, ` + 
                `${this.#current_token().position.column}) with any rule`);
            }
            
            node.children = this.#tokens[this.#position++];

            return node;
        }

        if (Parser.#ast.has(RULE_NAME) === false) 
        {
            throw new Error(`syntax error at (${this.#current_token().position.row}`
            + `, ${this.#current_token().position.column}): no rule named ${RULE_NAME}`);
        }
        if (Parser.#ast.get(RULE_NAME).has(this.#current_token().type) === false) 
        {
            if (Parser.#ast.get(RULE_NAME).has(NOP) === false) 
            {
                var error_message = `error at (${this.#current_token().position.row}`
                + `, ${this.#current_token().position.column}) in rule "${RULE_NAME}", expected tokens:`;

                for (const TOKEN of Parser.#ast.get(RULE_NAME).keys()) 
                {
                    error_message += " " + TOKEN;
                }

                error_message += ` but given ${this.#current_token().type}`;
                throw new Error(error_message);
            }
            else 
            {
                return null;
            }
        }

        const CURRENT_RULE          = Parser.#syntax_rules[RULE_NAME];
        const CURRENT_TOKEN_TYPE    = Parser.#ast.get(RULE_NAME).get(this.#current_token().type);

        for (const child_rule of CURRENT_RULE[CURRENT_TOKEN_TYPE]) 
        {
            node.add_child(this.#get_parse_tree(child_rule));
        }

        return node;
    }

    parse ()
    {
        var parse_tree = this.#get_parse_tree("Program");

        return parse_tree;
    }
}