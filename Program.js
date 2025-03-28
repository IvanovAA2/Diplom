
class Object
{
    symbol_type;
    type;
    data; 

    static typeof =
    {
        variable    : 0,
        function    : 1,
        value       : 2,

        null    : 0,
        bool    : 1,
        number  : 2,
        string  : 3,
        array   : 4,

        ref     : 5,
    }

    static data_name = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],
        [5, "ref"],
    ])

    static symbol_name = new Map
    ([
        [0, "var-l"],
        [1, "fun-n"],
        [2, "value"],
    ])

    constructor (symbol_type, type, data)
    {
        this.symbol_type    = symbol_type;
        this.type           = type;
        this.data           = data;
    }
}

class Operation
{
    type;
    operands;
    position;

    constructor (type, operands, position)
    {
        this.type       = type;
        this.operands   = operands;
        this.position   = position;
    }
}

class Scope
{
    parent;
    symbol_table;

    constructor (parent)
    {
        this.parent = parent;
        this.symbol_table = new Map();
    }
}

class Program
{
    #parse_tree;

    #data               = [];
    #operations         = [];
    #current_operation  = 0;
    #scope_tree         = [new Scope(-1)];
    #current_scope      = 0;
    #return_jumps       = [];

    #time_start         = null;
    overall_time       = 0;

    constructor (parse_tree) 
    {
        this.#parse_tree = parse_tree;

        this.#generate_program();
    }

    #visitor (node, arg = null)
    {
        switch (node.rule_name)
        {
            // just branching
            case "Program" :
            case "Statements" :
            case "Expressions" :
            case "$Expressions" :
            {
                this.#visit_children(node);
            }
            break;

            // "{" "Statements" "}"
            case "Scope":
            {
                this.#branch_scope();

                this.#visitor(node.children[1]);

                this.#leave_scope();
            }
            break;

            case "While":
            {
                const begin             = this.#operations.length - 1;
                const bool_expression   = this.#add_value();
                const position          = node.children[0].children.position;

                this.#branch_scope();
                
                this.#add_operation("bool", [bool_expression, this.#visitor(node.children[2])], position);
                const operation = this.#operations.length;
                this.#add_operation("if", [null, bool_expression], position);

                const to_end = this.#visitor(node.children[4], [begin, [operation]])[1];

                const end = this.#operations.length;
                for (const op_pos of to_end)
                {
                    this.#operations[op_pos].operands[0] = end; 
                }

                this.#add_operation("jump", [begin], position);

                this.#leave_scope();
            }
            break;
            case "For":
            {
                const position = node.children[0].children.position;

                this.#branch_scope();

                this.#visitor(node.children[2]);

                const begin             = this.#operations.length - 1;
                const bool_expression   = this.#add_value();
                
                this.#add_operation("bool", [bool_expression, this.#visitor(node.children[4])], position);
                const operation = this.#operations.length;
                this.#add_operation("if", [null, bool_expression], position);

                const to_end = this.#visitor(node.children[8], [begin, [operation]])[1];

                this.#visitor(node.children[6]);

                const end = this.#operations.length;
                for (const op_pos of to_end)
                {
                    this.#operations[op_pos].operands[0] = end; 
                }

                this.#add_operation("jump", [begin], position);

                this.#leave_scope();
            }
            break;

            case "LoopScope":
            {
                if (node.children.length === 3)
                {
                    if (node.children[1].rule_name === "LoopStatement" ||
                        node.children[1].rule_name === "LoopStatements" 
                    )
                    {
                        this.#visitor(node.children[1], arg)
                    }
                    else
                    {
                        this.#visitor(node.children[1]);
                    }
                }
                return arg;
            }
            case "LoopStatements":
            {
                if (node.children[0].rule_name === "LoopStatement" ||
                    node.children[0].rule_name === "LoopScope"
                )
                {
                    this.#visitor(node.children[0], arg)
                    this.#visitor(node.children[1], arg);
                }
                else
                {
                    this.#visitor(node.children[0]);
                    this.#visitor(node.children[1], arg);
                }
            }
            break;
            case "LoopStatement":
            {
                const position = node.children[0].children.position;

                if (node.children[0].rule_name === "break")
                {
                    arg[1].push(this.#operations.length);

                    this.#add_operation("jump", [null], position);
                }
                if (node.children[0].rule_name === "continue")
                {
                    this.#add_operation("jump", [arg[0]], position);
                }
            }
            break;

            case "ForDeclaration":
            {
                if (node.children[1].rule_name === "id") 
                {
                    const variable_name = node.children[1].children.string;
                    const position      = node.children[1].children.position;

                    this.#create_variable(variable_name, this.#create_value(Object.typeof.null, null), position);
                }
                else 
                {
                    this.#visitor(node.children[1]);
                }
            }
            break;
            case "Declaration" :
            case "$Declaration" : // "," "SingleDeclaration" "$Declaration"
            {
                if (node.children[1].rule_name === "id") 
                {
                    const variable_name = node.children[1].children.string;
                    const position      = node.children[1].children.position;

                    this.#create_variable(variable_name, this.#create_value(Object.typeof.null, null), position);
                }
                else 
                {
                    this.#visitor(node.children[1]);
                }

                this.#visitor(node.children[2]);
            }
            break;
            case "SingleDeclaration" :
            {
                const variable_name = node.children[0].children.string;
                const position      = node.children[0].children.position;

                this.#create_variable(variable_name, this.#visitor(node.children[1]), position);
            }
            break;
            case "$SingleDeclaration" :
            {
                return this.#visitor(node.children[1]);
            }

            // pass left operand to pair of operation and right operand
            case "AssignOp":
            case "BoolOr":
            case "BoolAnd":
            case "BitOr":
            case "BitXor":
            case "BitAnd":
            case "EqualOp":
            case "CompOp":
            case "AddOp":
            case "MulOp":
            {
                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }

            // operations
            case "$AssignOp":
            {
                const operation_type    = node.children[0].children.type;
                const position          = node.children[0].children.position;

                this.#add_operation(operation_type, [arg, this.#visitor(node.children[1])], position);
                        
                return arg;
            }

            case "$BoolOr":
            case "$BoolAnd":
            case "$EqualOp":
            case "$CompOp":
            case "$AddOp":
            case "$MulOp":
            {
                const operation_type    = node.children[0].children.type;
                const destination       = this.#add_value();
                const position          = node.children[0].children.position;
                
                this.#add_operation(operation_type, [destination, arg, this.#visitor(node.children[1])], position);

                return destination;
            }

            case "$Value":
            {
                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }
            case "Value":
            {
                if (node.children.length === 3) // "(" Expression ")"
                {
                    return this.#visitor(node.children[1]);
                }

                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }
            case "Accessing":
            {
                if (node.children[2].rule_name === "]")
                {
                    const destination   = this.#add_value(Object.typeof.ref, null);
                    const array         = arg;
                    const index         = this.#visitor(node.children[1]);
                    const position      = node.children[0].children.position;

                    this.#add_operation("accs", [destination, array, index], position);

                    if (node.children.length === 4) // "[" "Expression" "]" "Accessing"
                    {
                        return this.#visitor(node.children[3], destination);
                    }
                    if (node.children.length === 3) // "[" "Expression" "]"
                    {
                        return destination;
                    }
                }
                else
                {
                    const destination = this.#add_value();

                    this.#add_operation(
                    "slice", 
                    [
                        destination, 
                        arg, 
                        this.#visitor(node.children[1]), 
                        this.#visitor(node.children[2])
                    ], 
                    node.children[0].children.position
                    );

                    if (node.children.length === 5) // "[" "Expression", "Slice" "]" "Accessing"
                    {
                        return this.#visitor(node.children[4], destination);
                    }
                    if (node.children.length === 4) // "[" "Expression", "Slice" "]"
                    {
                        return destination;
                    }
                }
                throw new Error("Accessing ill-formed");
            }
            case "Slice":
            {
                return this.#visitor(node.children[1]);
            }

            case "null":
            {
                return this.#create_value(Object.typeof.null, null, node.children.position);
            }
            case "true":
            {
                return this.#create_value(Object.typeof.bool, true, node.children.position);
            }
            case "false":
            {
                return this.#create_value(Object.typeof.bool, false, node.children.position);
            }
            case "numberToken":
            {
                return this.#create_value(Object.typeof.number, Number(node.children.string), node.children.position);
            }
            case "stringToken":
            {
                return this.#create_value(Object.typeof.string, node.children.string, node.children.position);
            }
            case "Array":
            {
                if (node.children.length === 2) // "[" "]"
                {
                    return this.#create_value(Object.typeof.array, [], node.children.position);
                }
                // "[" "$Array" "]"
                if (node.children[1].rule_name === "$Array")
                {
                    return this.#create_value(Object.typeof.array, this.#visitor(node.children[1]), node.children.position);
                }

                return this.#create_value(Object.typeof.array, [this.#make_variable(this.#visitor(node.children[1]))], node.children.position);
            }
            case "$Array":
            {
                var array = [this.#make_variable(this.#visitor(node.children[0]))];

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], array);
                }

                return array;
            }
            case "$$Array":
            {
                arg.push(this.#make_variable(this.#visitor(node.children[1])));

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg); 
                }
            }
            break;

            case "Boolean":
            {
                const destination       = this.#add_value();
                const position          = node.children[0].children.position;
                
                this.#add_operation("bool", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }
            case "Number":
            {
                const destination       = this.#add_value();
                const position          = node.children[0].children.position;
                
                this.#add_operation("num", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }
            case "String":
            {
                const destination       = this.#add_value();
                const position          = node.children[0].children.position;
                
                this.#add_operation("str", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }

            case "id":
            {
                const id_name   = node.children.string;
                const position  = node.children.position;

                return this.#get_id(id_name, position);
            }

            case "Conditional":
            {
                arg = this.#visitor(node.children[0], true);

                if (node.children[1].rule_name !== "$ElifBlock")
                {
                    arg[1] = true;
                }

                this.#visitor(node.children[1], arg);
            }
            break;
            case "IfBlock":
            {
                const bool_expression   = this.#add_value();
                const position          = node.children[0].children.position;
                
                this.#add_operation("bool", [bool_expression, this.#visitor(node.children[2])], position);
                const operation = this.#operations.length;
                this.#add_operation("if", [null, bool_expression], position);

                this.#visitor(node.children[4]);

                const jump_to_end = this.#operations.length;

                this.#operations[operation].operands[0] = this.#operations.length;
                this.#add_operation("jump", [jump_to_end], position);

                if (arg === true)
                {
                    return [[jump_to_end], false];
                }
            }
            break;
            case "$ElifBlock":
            {
                arg = this.#visitor(node.children[0], arg);

                if (node.children[1].rule_name !== "$ElifBlock")
                {
                    arg[1] = true;
                }

                this.#visitor(node.children[1], arg);  
            }
            break;
            case "ElifBlock":
            {
                const bool_expression   = this.#add_value();
                const position          = node.children[0].children.position;
                
                this.#add_operation("bool", [bool_expression, this.#visitor(node.children[2])], position);
                const operation = this.#operations.length;
                this.#add_operation("if", [null, bool_expression], position);

                this.#visitor(node.children[4]);

                const jump_to_end = this.#operations.length;

                this.#operations[operation].operands[0] = this.#operations.length;
                this.#add_operation("jump", [jump_to_end], position);

                if (arg[1] === false)
                {
                    arg[0].push(jump_to_end);

                    return arg;
                }

                for (const operation of arg[0])
                {
                    this.#operations[operation].operands[0] = jump_to_end;
                }
            }
            break;
            case "ElseBlock":
            {
                this.#visitor(node.children[1]);

                const jump_to_end = this.#operations.length - 1;
                for (const operation of arg[0])
                {
                    this.#operations[operation].operands[0] = jump_to_end;
                }
            }
            break;

            case "FunctionCall":
            {
                const destination = this.#add_value();
                // TODO
                return destination;
            }

            case "DefaultFunctionCall":
            {
                switch (node.children[0].rule_name)
                {
                    case "print":
                    {
                        const position  = node.children[0].children.position;
                        var parameters  = [];

                        if (node.children.length === 4)
                        {
                            if (node.children[2].rule_name === "Parameters")
                            {
                                this.#visitor(node.children[2], parameters);
                            }
                            else
                            {
                                parameters.push(this.#visitor(node.children[2]));
                            }
                        }

                        this.#add_operation("print", parameters, position);

                        return this.#add_value();
                    }
                    case "input":
                    {
                        const position      = node.children[0].children.position;
                        const destination   = this.#add_value();
                        var text            = -1;

                        if (node.children.length === 4) 
                        {
                            text = this.#visitor(node.children[2]);
                        }

                        this.#add_operation("await", [text], position);
                        this.#add_operation("input", [destination], position);

                        return destination;
                    }

                    case "get":
                    {
                        const destination   = this.#add_value();
                        const array         = this.#visitor(node.children[2]);
                        const index         = this.#visitor(node.children[4]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("get", [destination, array, index], position);

                        return destination;
                    }

                    case "set":
                    {
                        const destination   = this.#add_value();
                        const array         = this.#visitor(node.children[2]);
                        const index         = this.#visitor(node.children[4]);
                        const from          = this.#visitor(node.children[6]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("set", [destination, array, index, from], position);

                        return destination;
                    }

                    case "isBool":
                    {
                        const destination   = this.#add_value();
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("isb", [destination, object], position);

                        return destination;
                    }
                    case "isNumber":
                    {
                        const destination   = this.#add_value();
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("isn", [destination, object], position);

                        return destination;
                    }
                    case "isString":
                    {
                        const destination   = this.#add_value();
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("iss", [destination, object], position);

                        return destination;
                    }
                    case "isArray":
                    {
                        const destination   = this.#add_value();
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("isa", [destination, object], position);

                        return destination;
                    }

                    case "len":
                    {
                        const destination   = this.#add_value();
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#add_operation("len", [destination, object], position);

                        return destination;
                    }
                }
            }

            case "Parameters":
            {
                arg.push(this.#visitor(node.children[0]));

                this.#visitor(node.children[1], arg);
            }
            break;
            case "$Parameters":
            {
                arg.push(this.#visitor(node.children[1]));

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg);
                }
            }
            break;
        }
    }

    #generate_program ()
    {
        this.#visitor(this.#parse_tree);
    }

    #visit_children (node)
    {
        for (const child of node.children) 
        {
            this.#visitor(child);
        }
    }

    #create_value (type, data, position)
    {
        const destination = this.#data.length;

        this.#data.push(new Object(Object.typeof.value));
        this.#add_operation("create", [destination, type, data], position);

        return destination;
    }

    #add_value (type = Object.typeof.null, data = null)
    {
        const destination = this.#data.length;

        this.#data.push(new Object(Object.typeof.value, type, data));

        return destination;
    }

    #make_variable (position)
    {
        this.#data[position].symbol_type = Object.typeof.variable;

        return position;
    }

    #add_operation (type, operands, position)
    {
        this.#operations.push(new Operation(type, operands, position));
    }

    #create_variable (name, from, position)
    {
        if (this.#scope_tree[this.#current_scope].symbol_table.has(name))
        {
            throw new Error(`multiple initializations of "${name}" at (${position.row}, ${position.column})`);
        }

        const variable_position = this.#data.length;

        this.#data.push(new Object(Object.typeof.variable, Object.typeof.null, null));
        this.#add_operation("=", [variable_position, from], position);

        this.#scope_tree[this.#current_scope].symbol_table.set(name, variable_position);
    }

    #get_id (name, position)
    {
        var scope = this.#current_scope;

        while (this.#scope_tree[scope].symbol_table.has(name) === false) 
        {
            scope = this.#scope_tree[scope].parent;

            if (scope === -1) 
            {
                throw new Error(`uninitialized variable named "${name}" at (${position.row}, ${position.column})`);
            }
        }

        return this.#scope_tree[scope].symbol_table.get(name);
    }

    #branch_scope ()
    {
        const previous_scope = this.#current_scope;
        this.#current_scope = this.#scope_tree.length;

        this.#scope_tree.push(new Scope(previous_scope));
    }

    #leave_scope ()
    {
        this.#current_scope = this.#scope_tree[this.#current_scope].parent;
    }

    #evoke_error (from = 1, to = 1e9)
    {
        const current_operation = this.#operations[this.#current_operation];
        const operation_type    = current_operation.type;
        const operands          = current_operation.operands;
        const position          = current_operation.position;

        var message = `can't execute "${operation_type}" with [`;
        for (const index in operands)
        {
            if (index >= from + 1)
            {
                message += ", ";
            }
            if (index >= from) 
            {
                message += Object.data_name.get(this.#data[operands[index]].type);
            }
            if (index == to)
            {
                break;
            }
        }
        message += `] at (${position.row}, ${position.column})`;

        throw new Error(message);
    }

    #print_data(comment = "")
    {
        console.log(comment);
        console.log(Array(15).join('-'));

        for(const x in this.#data)
        {
            console.log(`${x}: ${Object.symbol_name.get(this.#data[x].symbol_type)} \t${Object.data_name.get(this.#data[x].type)} \t${this.#data[x].data}`);
        }
    }

    async run () 
    {
        this.#time_start = performance.now();
        
        // DEBUG    
        
        if (this.#current_operation === 0)
        {
            console.log(this.#operations);
            this.#print_data();
            console.log(this.#data);
            
            this.#return_jumps = [];
        }
        
        // DEBUG

        var end = false;
        
        while (this.#current_operation < this.#operations.length)
        {
            const current_operation     = this.#operations[this.#current_operation];
            const operation_type        = current_operation.type;
            const operands              = current_operation.operands.slice();
            const position              = current_operation.position;

            for (const index in operands)
            {
                if (this.#data[operands[index]]
                    && this.#data[operands[index]].type === Object.typeof.ref
                    && operation_type !== "create"
                    && !(index == 0 && ["accs", "if", "jump"].includes(operation_type))
                )
                {
                    operands[index] = this.#data[operands[index]].data;
                }
            }

            // DEBUG

            // console.log(operation_type, Array(8 - operation_type.length + 1).join(' '), operands);

            // await new Promise(r => setTimeout(r, 1000)); // -----------------------PAUSE--------------------------------

            // DEBUG


            switch (operation_type)
            {
                case "if":
                {
                    const bool_expression   = this.#data[operands[1]];
                    const result            = bool_expression.data;

                    if (result === false)
                    {
                        this.#current_operation = operands[0];
                    }
                }
                break;
                case "jump":
                {
                    this.#current_operation = operands[0];
                }
                break;

                case "create":
                {
                    this.#data[operands[0]].type = operands[1];
                    this.#data[operands[0]].data = structuredClone(operands[2]);
                }
                break;
                case "=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    this.#data[operands[0]].type = this.#data[operands[1]].type;
                    this.#data[operands[0]].data = this.#data[operands[1]].data;
                }
                break;
                case "+=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    if (this.#data[operands[0]].type === Object.typeof.array &&
                        this.#data[operands[1]].type === Object.typeof.array 
                    )
                    {
                        this.#data[operands[0]].data.push(...(this.#data[operands[1]].data));

                        break;
                    }
                    if (this.#data[operands[0]].type === Object.typeof.null ||
                        this.#data[operands[1]].type === Object.typeof.null ||
                        this.#data[operands[0]].type === Object.typeof.array ||
                        this.#data[operands[1]].type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = 
                    Math.max(this.#data[operands[0]].type, this.#data[operands[1]].type, Object.typeof.number);
                    this.#data[operands[0]].data += this.#data[operands[1]].data;
                }
                break;
                case "-=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    if (this.#data[operands[0]].type !== Object.typeof.bool &&
                        this.#data[operands[0]].type !== Object.typeof.number ||
                        this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data -= this.#data[operands[1]].data;
                }
                break;
                case "*=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    if (this.#data[operands[1]].type !== Object.typeof.number &&
                        this.#data[operands[1]].type !== Object.typeof.bool ||
                        this.#data[operands[0]].type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[0]].type === Object.typeof.array)
                    {
                        var number = this.#data[operands[1]].data;
                        if (this.#data[operands[1]].type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        else
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...this.#data[operands[0]].data);
                        }

                        this.#data[operands[0]].data = array;

                        break;
                    }
                    if (this.#data[operands[0]].type === Object.typeof.string)
                    {
                        var number = this.#data[operands[1]].data;
                        if (this.#data[operands[1]].type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        else
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += this.#data[operands[0]].data;
                        }

                        this.#data[operands[0]].data = string;

                        break;
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data *= this.#data[operands[1]].data;
                }
                break;
                case "/=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    if (this.#data[operands[0]].type !== Object.typeof.number ||
                        this.#data[operands[1]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[1]].data === 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[operands[0]].data /= this.#data[operands[1]].data;
                }
                break;
                case "//=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    if (this.#data[operands[0]].type !== Object.typeof.number ||
                        this.#data[operands[1]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[1]].data === 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    Math.trunc(this.#data[operands[0]].data / this.#data[operands[1]].data);
                }
                break;
                case "%=":
                {
                    if (this.#data[operands[0]].symbol_type !== Object.typeof.variable)
                    {
                        throw new Error(`can't assign to not variable at (${position.row}, ${position.column})`);
                    }
                    if (this.#data[operands[0]].type !== Object.typeof.number ||
                        this.#data[operands[1]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[1]].data === 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[operands[0]].data %= this.#data[operands[1]].data;
                }
                break;

                case "print":
                {
                     for (const position of operands)
                     {
                        switch (this.#data[position].type)
                        {
                            case Object.typeof.null:
                            {
                                addOutput("null");
                            }
                            break;

                            case Object.typeof.bool:
                            case Object.typeof.number:
                            case Object.typeof.string:
                            {
                                addOutput(String(this.#data[position].data));   
                            }
                            break;

                            case Object.typeof.array:
                            {
                                addOutput("[");

                                for (const index in this.#data[position].data)
                                {
                                    const ref = this.#data[position].data[index];

                                    if (index > 0)
                                    {
                                        addOutput(", ");
                                    }

                                    switch (this.#data[ref].type)
                                    {
                                        case Object.typeof.null:
                                        {
                                            addOutput("null");
                                        }
                                        break;

                                        case Object.typeof.bool:
                                        case Object.typeof.number:
                                        case Object.typeof.string:
                                        {
                                            addOutput(String(this.#data[ref].data));   
                                        }
                                        break;

                                        case Object.typeof.array:
                                        {
                                            addOutput(`[...](${this.#data[ref].data.length})`);
                                        }
                                        break;
                                    }
                                }

                                addOutput("]");
                            }
                            break;
                        }
                     }
                }
                break;
                case "await":
                {
                    const position  = operands[0];
                    var text        = "Input";

                    if (position !== -1)
                    {
                        text = String(this.#data[position].data);
                    }

                    end = true;
                    wait_for_input(text);
                }
                break;
                case "input":
                {
                    const destination   = operands[0];
                    const text          = get_input();       

                    this.#data[destination].type = Object.typeof.string;
                    this.#data[destination].data = text;
                }
                break;

                case "get":
                {
                    const destination   = operands[0];
                    const array         = this.#data[operands[1]];
                    const index         = this.#data[operands[2]];
                    const object        = this.#data[array.data[index.data]];

                    if (array.type !== Object.typeof.array ||
                        index.type !== Object.typeof.number
                    )
                    {
                        evoke_error();
                    }

                    this.#data[destination].type = object.type;
                    this.#data[destination].data = object.data;
                }
                break;

                case "set":
                {
                    const array         = this.#data[operands[0]];
                    const index         = this.#data[operands[1]];
                    const from          = this.#data[operands[2]];
                    const object        = this.#data[array.data[index.data]];

                    if (array.type !== Object.typeof.array ||
                        index.type !== Object.typeof.number
                    )
                    {
                        evoke_error();
                    }

                    object.type = from.type;
                    object.data = from.data;
                }
                break;

                case "isb":
                {
                    const destination   = this.#data[operands[0]];
                    const value         = this.#data[operands[1]];

                    destination.type = Object.typeof.bool;
                    destination.data = value.type === Object.typeof.bool;
                }
                break;
                case "isn":
                {
                    const destination   = this.#data[operands[0]];
                    const value         = this.#data[operands[1]];

                    destination.type = Object.typeof.bool;
                    destination.data = value.type === Object.typeof.number;
                }
                break;
                case "iss":
                {
                    const destination   = this.#data[operands[0]];
                    const value         = this.#data[operands[1]];

                    destination.type = Object.typeof.bool;
                    destination.data = value.type === Object.typeof.string;
                }
                break;
                case "isa":
                {
                    const destination   = this.#data[operands[0]];
                    const value         = this.#data[operands[1]];

                    destination.type = Object.typeof.bool;
                    destination.data = value.type === Object.typeof.array;
                }
                break;

                case "len":
                {
                    const destination   = this.#data[operands[0]];
                    const object        = this.#data[operands[1]];

                    if (object.type !== Object.typeof.string &&
                        object.type !== Object.typeof.array
                    )
                    {
                        this.#evoke_error();
                    }

                    destination.type = Object.typeof.number;
                    destination.data = object.data.length;
                }
                break;

                case "accs":
                {
                    const array = this.#data[operands[1]];
                    const index = this.#data[operands[2]];

                    if (array.type !== Object.typeof.array ||
                        index.type !== Object.typeof.number 
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].data = array.data[index.data];
                }
                break;

                case "slice":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.string &&
                        this.#data[operands[1]].type !== Object.typeof.array ||
                        this.#data[operands[2]].type !== Object.typeof.number ||
                        this.#data[operands[3]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = this.#data[operands[1]].type;
                    this.#data[operands[0]].data = this.#data[operands[1]].data.slice(
                        this.#data[operands[2]].data,
                        this.#data[operands[3]].data
                    );
                }
                break;

                case "bool":
                {
                    this.#data[operands[0]].type = Object.typeof.bool;

                    switch (this.#data[operands[1]].type)
                    {
                        case Object.typeof.bool:
                        {
                            this.#data[operands[0]].data = this.#data[operands[1]].data;
                        }
                        break;

                        case Object.typeof.number:
                        {
                            this.#data[operands[0]].data = this.#data[operands[1]].data !== 0;
                        }
                        break;

                        case Object.typeof.string:
                        {
                            this.#data[operands[0]].data = this.#data[operands[1]].data === "true";
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "num":
                {
                    this.#data[operands[0]].type = Object.typeof.number;

                    switch (this.#data[operands[1]].type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            this.#data[operands[0]].data = Number(this.#data[operands[1]].data);
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "str":
                {
                    this.#data[operands[0]].type = Object.typeof.string;

                    switch (this.#data[operands[1]].type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            this.#data[operands[0]].data = String(this.#data[operands[1]].data);
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "or":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data || this.#data[operands[2]].data;
                }
                break;
                case "and":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data && this.#data[operands[2]].data;
                }
                break;

                case "|":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data | this.#data[operands[2]].data;
                }
                break;
                case "^":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data ^ this.#data[operands[2]].data;
                }
                break;
                case "&":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data & this.#data[operands[2]].data;
                }
                break;

                case "==":
                {
                    if (this.#data[operands[1]].type === Object.typeof.null ||
                        this.#data[operands[2]].type === Object.typeof.null 
                    )
                    {
                        this.#data[operands[0]].type = Object.typeof.bool;
                        this.#data[operands[0]].data = 
                        this.#data[operands[1]].type === this.#data[operands[2]].type;

                        break;
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data == this.#data[operands[2]].data;
                }
                break;
                case "!=":
                    {
                        if (this.#data[operands[1]].type === Object.typeof.null ||
                            this.#data[operands[2]].type === Object.typeof.null 
                        )
                        {
                            this.#data[operands[0]].type = Object.typeof.bool;
                            this.#data[operands[0]].data = 
                            this.#data[operands[1]].type !== this.#data[operands[2]].type;
    
                            break;
                        }
    
                        this.#data[operands[0]].type = Object.typeof.bool;
                        this.#data[operands[0]].data = 
                        this.#data[operands[1]].data != this.#data[operands[2]].data;
                    }
                break;
                case "===":
                {
                    if (this.#data[operands[1]].type === Object.typeof.null ||
                        this.#data[operands[2]].type === Object.typeof.null 
                    )
                    {
                        this.#data[operands[0]].type = Object.typeof.bool;
                        this.#data[operands[0]].data = 
                        this.#data[operands[1]].type === this.#data[operands[2]].type;

                        break;
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data === this.#data[operands[2]].data;
                }
                break;
                case "!==":
                    {
                        if (this.#data[operands[1]].type === Object.typeof.null ||
                            this.#data[operands[2]].type === Object.typeof.null 
                        )
                        {
                            this.#data[operands[0]].type = Object.typeof.bool;
                            this.#data[operands[0]].data = 
                            this.#data[operands[1]].type !== this.#data[operands[2]].type;
    
                            break;
                        }
    
                        this.#data[operands[0]].type = Object.typeof.bool;
                        this.#data[operands[0]].data = 
                        this.#data[operands[1]].data !== this.#data[operands[2]].data;
                    }
                break;

                case "<":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data < this.#data[operands[2]].data;
                }
                break;
                case ">":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data > this.#data[operands[2]].data;
                }
                break;
                case "<=":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data <= this.#data[operands[2]].data;
                }
                break;
                case ">=":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.bool;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data >= this.#data[operands[2]].data;
                }
                break;

                case "+":
                {
                    if (this.#data[operands[1]].type === Object.typeof.array &&
                        this.#data[operands[2]].type === Object.typeof.array 
                    )
                    {
                        this.#data[operands[0]].type = Object.typeof.array ;
                        this.#data[operands[0]].data = [];
                        this.#data[operands[0]].data.push(...this.#data[operands[1]].data);
                        this.#data[operands[0]].data.push(...this.#data[operands[2]].data);

                        break;
                    }
                    if (this.#data[operands[1]].type === Object.typeof.null ||
                        this.#data[operands[2]].type === Object.typeof.null ||
                        this.#data[operands[1]].type === Object.typeof.array ||
                        this.#data[operands[2]].type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = 
                    Math.max(this.#data[operands[1]].type, this.#data[operands[2]].type, Object.typeof.number);
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data + this.#data[operands[2]].data;
                }
                break;
                case "-":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.bool &&
                        this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.bool &&
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data - this.#data[operands[2]].data;
                }
                break;

                case "*":
                {
                    if (this.#data[operands[2]].type !== Object.typeof.number &&
                        this.#data[operands[2]].type !== Object.typeof.bool ||
                        this.#data[operands[1]].type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[1]].type === Object.typeof.array)
                    {
                        var number = this.#data[operands[2]].data;
                        if (this.#data[operands[2]].type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        else
                        {
                            number = Number(number);
                        }
                        this.#data[operands[0]].type = Object.typeof.array;
                        this.#data[operands[0]].data = [];

                        for (var count = 0; count < number; ++count)
                        {
                            this.#data[operands[0]].data.push(...this.#data[operands[1]].data);
                        }

                        break;
                    }
                    if (this.#data[operands[1]].type === Object.typeof.string)
                    {
                        var number = this.#data[operands[2]].data;
                        if (this.#data[operands[2]].type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        else
                        {
                            number = Number(number);
                        }
                        this.#data[operands[0]].type = Object.typeof.string;
                        this.#data[operands[0]].data = "";

                        for (var count = 0; count < number; ++count)
                        {
                            this.#data[operands[0]].data += this.#data[operands[1]].data;
                        }

                        break;
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data * this.#data[operands[2]].data;
                }
                break;
                case "/":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[2]].data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data / this.#data[operands[2]].data;
                }
                break;
                case "//":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[2]].data === 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    Math.trunc(this.#data[operands[1]].data / this.#data[operands[2]].data);
                }
                break;
                case "%":
                {
                    if (this.#data[operands[1]].type !== Object.typeof.number ||
                        this.#data[operands[2]].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[operands[2]].data === 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[operands[0]].type = Object.typeof.number;
                    this.#data[operands[0]].data = 
                    this.#data[operands[1]].data % this.#data[operands[2]].data;
                }
                break;
            }

            ++this.#current_operation;
            if (end)
            {
                break;
            }
        }

        this.overall_time += performance.now() - this.#time_start;
        this.#time_start = null;
    }
}