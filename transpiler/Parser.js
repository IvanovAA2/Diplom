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

            // console.log(Parser.#ast);
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
            ["Scope"],
            
            ["Declaration", ";"],
            
            ["Conditional"],
            ["Loop"],
            ["Function"],
            ["FlowControl"],
            
            ["Class"],
        ],
        Scope :
        [
            ["{", "Statements", "}"],
        ],
        
        Class :
        [
            ["class", "id", "{", "ClassStatements", "}"],  
        ],
        ClassStatements :
        [
            ["ClassStatement", "ClassStatements"],
            [NOP],  
        ],
        ClassStatement :
        [
            ["Constructor"],
            ["ClassMember"],
        ],
        Constructor :
        [
            ["constructor", "(", "FunctionParameters", ")", "Scope"],
        ],
        ClassMember :
        [
            ["id", "$ClassMember"],  
        ],
        $ClassMember :
        [
            ["ClassField"],
            ["ClassMethod"],
        ],
        ClassField :
        [
            ["=", "Expression", ";"],
            [";"],
        ],
        ClassMethod :
        [
            ["(", "FunctionParameters", ")", "Scope"],
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
            ["if", "(", "BoolExpression", ")", "Statement", "ElseBlock"],
        ],
        ElseBlock :
        [
            ["else", "Statement"],
            [NOP],
        ],

        Loop : 
        [
            ["For"],
            ["While"],
        ],
        While :
        [
            ["while", "(", "BoolExpression", ")", "Statement"],
        ],
        For :
        [
            ["for", "(", "ExpressionOrDeclaration", ";", "BoolExpression", ";", "Expression", ")", "Statement"],
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
            ["UnaryOp", "$MulOp"],
        ],
        $MulOp :
        [
            ["*", "UnaryOp", "$MulOp"],
            ["/", "UnaryOp", "$MulOp"],
            ["//", "UnaryOp", "$MulOp"],
            ["%", "UnaryOp", "$MulOp"],
            [NOP],
        ],
        
        
        UnaryOp :
        [
            ["-", "Accessing"],
            ["not", "Accessing"],
            ["Accessing"],
        ],
        Accessing :
        [
            ["Value", "$Accessing"],
        ],
        
        $Accessing :
        [
            ["SingleAccessing", "$Accessing"],
            [NOP],
        ],
        SingleAccessing :
        [
            ["SubscriptOrSlice"],
            ["MemberAccessing"],
            ["FunctionCall"],
        ],
        SubscriptOrSlice :
        [
            ["[", "Expression", "Slice", "]"],
        ],
        Slice :
        [
            [":", "Expression"],
            [NOP],
        ],
        MemberAccessing :
        [
            [".", "id"],
        ],
        FunctionCall :
        [
            ["(", "Parameters", ")"],
        ],

        Value :
        [
            ["(", "Expression", ")"],

            ["Null"],
            ["Boolean"],
            ["Number"],
            ["String"],
            ["Array"],

            ["Variable"],
            
            ["NewObject"],
            ["This"],
        ],
        
        NewObject :
        [
            ["new", "id", "(", "FunctionParameters", ")"],  
        ],
        This :
        [
            ["this"],
        ],

        Variable :
        [
            ["id"],
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
            ["number_token"],

            ["number", "(", "Expression", ")"],
        ],
        String :
        [
            ["string_token"],

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
        let node = new Node(RULE_NAME);

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
                let error_message = `error at (${this.#current_token().position.row}`
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
        let parse_tree = this.#get_parse_tree("Program");

        return parse_tree;
    }
}