 const NOP = "NOP";

class Node
{
    rule_name;
    children = null;

    constructor (rule_name)
    {
        this.rule_name = rule_name;
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

            for (const rule_name in Parser.#syntax_rules) 
            {
                Parser.#build_ast(rule_name);
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

            ["FlowControl"],
        ],
        Scope :
        [
            ["{", "Statements", "}"],
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
            ["push", "(", "Expression", ")"],
            ["split", "(", "Expression", ")"],
            ["join", "(", "Expression", ")"],
        ],

        Value :
        [
            ["(", "Expression", ")"],

            ["Null"],
            ["Boolean"],
            ["Number"],
            ["String"],
            ["Array"],

            ["id", "FunctionCall"],
            ["DefaultFunctionCall"],
        ],

        FunctionCall :
        [
            ["(", "Parameters", ")"],
            [NOP],
        ],
        DefaultFunctionCall :
        [
            ["print",       "(", "Parameters", ")"],
            ["input",       "(", "Expression", ")"],
            ["isBool",      "(", "Expression", ")"],
            ["isNumber",    "(", "Expression", ")"],
            ["isString",    "(", "Expression", ")"],
            ["isArray",     "(", "Expression", ")"],
            ["len",         "(", "Expression", ")"],
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

    static #is_terminal(rule_name) 
    {
        return Lexer.tokens.has(rule_name) 
            || Lexer.keywords.has(rule_name) 
            || rule_name === EOF;
    }

    static #build_ast(rule_name)
    {
        if (rule_name === NOP || Parser.#is_terminal(rule_name)) 
        {
            return new Set([rule_name]);
        }
        if (Parser.#ast.has(rule_name) === false) 
        {
            const current_rule = Parser.#syntax_rules[rule_name];
            Parser.#ast.set(rule_name, new Map());

            for (const variant in current_rule) 
            {
                const first_tokens = Parser.#build_ast(current_rule[variant][0]);
                
                for (const token of first_tokens) 
                {
                    const current_ast_rule = Parser.#ast.get(rule_name);

                    if (current_ast_rule.has(token)) 
                    {
                        throw new Error(`in "${rule_name}" "${token}" occured in ` +
                            `"${current_rule[current_ast_rule.get(token)][0]}" ` +
                            `and "${current_rule[variant][0]}"`);
                    }
                    current_ast_rule.set(token, variant);
                }
            }
        }

        return new Set(Parser.#ast.get(rule_name).keys());
    }

    #current_token ()
    {
        return this.#tokens[this.#position];
    }
    
    #get_parse_tree (rule_name)
    {
        var node = new Node(rule_name);

        if (Parser.#is_terminal(rule_name)) 
        {
            node.children = this.#tokens[this.#position++];

            return node;
        }

        if (Parser.#ast.has(rule_name) === false) 
        {
            throw new Error(`syntax error at (${this.#current_token().position.row}`
            + `, ${this.#current_token().position.column}): no rule named ${rule_name}`);
        }
        if (Parser.#ast.get(rule_name).has(this.#current_token().type) === false) 
        {
            if (Parser.#ast.get(rule_name).has(NOP) === false) 
            {
                var error_message = `error at (${this.#current_token().position.row}`
                + `, ${this.#current_token().position.column}) in rule "${rule_name}", expected tokens:`;

                for (const token of Parser.#ast.get(rule_name).keys()) 
                {
                    error_message += " " + token;
                }

                error_message += ` but given ${this.#current_token().type}`;
                throw new Error(error_message);
            }
            else 
            {
                return null;
            }
        }

        const current_rule          = Parser.#syntax_rules[rule_name];
        const current_token_type    = Parser.#ast.get(rule_name).get(this.#current_token().type);

        for (const child_rule of current_rule[current_token_type]) 
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