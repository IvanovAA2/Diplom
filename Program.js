
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

        arac    : 5,
    }

    static data_name = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],
        [5, "arac"],
    ])

    static symbol_name = new Map
    ([
        [0, "var-l"],
        [1, "fun-n"],
        [2, "value"],
    ])

    constructor (type, data)
    {
        this.type   = type;
        this.data   = data;
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

    #operations = [];
    #scope_tree = [new Scope(-1)];
    #links      = [];

    #current_operation  = 0;
    #current_scope      = 0;

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
            case "Program":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;

            case "Statements":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "Statement":
            {
                this.#visitor(node.children[0], arg);
            }
            break;
            case "Scope":
            {
                this.#branch_scope();
                
                this.#visitor(node.children[1], arg);

                this.#leave_scope();
            }
            break;

            case "Conditional":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "$ElifBlock":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "IfBlock":
            {

            }
            break;
            case "ElifBlock":
            {

            }
            break;
            case "ElseBlock":
            {

            }
            break;

            case "Loop":
            {
                this.#visitor(node.children[0], arg);
            }
            break;
            case "While":
            {

            }
            break;
            case "For":
            {

            }
            break;
            case "ExpressionOrForDeclaration":
            {

            }
            break;
            case "ForDeclaration":
            {

            }
            break;
            case "LoopControl":
            {
                
            }
            break;

            case "Declaration":
            {
                this.#visitor(node.children[1], arg);
                this.#visitor(node.children[2], arg);
            }
            break;
            case "$Declaration":
            {
                if (node.children.length === 3)
                {
                    this.#visitor(node.children[1], arg);
                    this.#visitor(node.children[2], arg);
                }
            }
            break;
            case "SingleDeclaration":
            {
                const name      = node.children[0].children.string;
                const position  = node.children[0].children.position;

                this.#create_variable(name, position);

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], this.#get_object(name, position));
                }
            }
            break;
            case "$SingleDeclaration":
            {
                const variable  = arg;
                const value     = this.#visitor(node.children[1], null);
                const position  = node.children[0].children.position;

                const operation = this.#create_operation("=", [null, null], position);
                this.#add_to_link(variable, operation, 0);
                this.#add_to_link(value, operation, 1);
            }
            break;

            case "Expressions":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "$Expressions":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "Expression":
            {
                this.#visitor(node.children[0], arg);
            }
            break;

            case "AssignOp":
            {
                const link = this.#visitor(node.children[0], arg);

                if (node.children.length === 1)
                {
                    return link;
                }

                return this.#visitor(node.children[1], link);
            }
            break;
            case "$AssignOp":
            {
                const left              = arg;
                const right             = this.#create_link();
                const position          = node.children[0].children.position;
                const opearation_type   = node.children[0].children.string;

                const operation = this.#create_operation(opearation_type, [null, null], position);
                this.#add_to_link(left, operation, 0);
                this.#add_to_link(right, operation, 1);

                return left;
            }
            break;
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
                const link = this.#visitor(node.children[0], arg);

                if (node.children.length === 2)
                {
                    return this.#visitor(node.children[1], link);
                }
                
                return link;
            }
            break;
            case "$BoolOr":
            case "$BoolAnd":
            case "$BitOr":
            case "$BitXor":
            case "$BitAnd":
            case "$EqualOp":
            case "$CompOp":
            case "$AddOp":
            case "$MulOp":
            {
                const left              = arg;
                const right             = this.#visitor(node.children[1], null);
                const result            = this.#create_link();
                const position          = node.children[0].children.position;
                const opearation_type   = node.children[0].children.string;
                
                const operation = this.#create_operation(opearation_type, [null, null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(left, operation, 1);
                this.#add_to_link(right, operation, 2);

                if (node.children.length === 3)
                {
                    return this.#visitor(node.children[2], result);
                }

                return result;
            }
            break;

            case "$Value":
            {
                const value = this.#visitor(node.children[0], arg);

                if (node.children.length === 2)
                {
                    return this.#visitor(node.children[1], value);;
                }

                return value;
            }
            break;
            case "Accessing":
            {

            }
            break;
            case "$Accessing":
            {

            }
            break;
            case "SingleAccessing":
            {

            }
            break;
            case "Slice":
            {

            }
            break;

            case "Value":
            {
                if (node.children.length === 1)
                {
                    return this.#visitor(node.children[0], arg);
                }
                if (node.children.length === 2)
                {
                    
                }
                if (node.children.length === 3)
                {
                    return this.#visitor(node.children[1], arg);
                }
            }
            break;

            case "FunctionCall":
            {

            }
            break;
            case "DefaultFunctionCall":
            {
                const name = node.children[0].children.string;

                switch (name)
                {
                    case "print":
                    {
                        
                    }
                    break;
                }
            }
            break;

            case "Parameters":
            {
                const parameters    = this.#create_value(Object.typeof.array, []);
                const element       = this.#visitor(node.children[0], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(parameters, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], parameters);
                }
                
                return parameters;
            }
            break;
            case "$Parameters":
            {
                const parameters    = arg;
                const element       = this.#visitor(node.children[1], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(parameters, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], parameters);
                }
            }
            break;

            case "Null":
            {
                return this.#create_value(Object.typeof.null, null);
            }
            break;
            case "Boolean":
            {
                if (node.children.length === 1)
                {
                    return this.#visitor(node.children[0], arg);
                }

                const expression    = this.#visitor(node.children[2], arg);
                const result        = this.#create_link();
                const position      = node.children[0].children.position;

                const operation = this.#create_operation("bool", [null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(expression, operation, 1);

                return result;
            }
            break;
            case "true":
            {
                return this.#create_value(Object.typeof.bool, true);
            }
            break;
            case "false":
            {
                return this.#create_value(Object.typeof.bool, false);
            }
            break;
            case "Number":
            {
                if (node.children.length === 1)
                {
                    return this.#create_value(Object.typeof.number, Number(node.children[0].children.string));
                }

                const expression    = this.#visitor(node.children[2], arg);
                const result        = this.#create_link();
                const position      = node.children[0].children.position;

                const operation = this.#create_operation("num", [null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(expression, operation, 1);

                return result;
            }
            break;
            case "String":
            {
                if (node.children.length === 1)
                {
                    return this.#create_value(Object.typeof.number, node.children[0].children.string);
                }

                const expression    = this.#visitor(node.children[2], arg);
                const result        = this.#create_link();
                const position      = node.children[0].children.position;

                const operation = this.#create_operation("str", [null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(expression, operation, 1);

                return result;
            }
            break;
            case "Array":
            {
                const result = this.#create_value(Object.typeof.array, []);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[1], result);
                }
                
                return result;
            }
            break;
            case "$Array":
            {
                const array     = arg;
                const element   = this.#visitor(node.children[0], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(array, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], array);
                }
            }
            break;
            case "$$Array":
            {
                const array     = arg;
                const element   = this.#visitor(node.children[1], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(array, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], array);
                }
            }
            break;
        }
    }

    #generate_program ()
    {
        this.#visitor(this.#parse_tree);
    }

    #create_link ()
    {
        const link = this.#links.length;

        this.#links.push([]);

        return link;
    }

    #add_to_link (link, operation, position)
    {
        this.#links[link].push([operation, position]);
    }

    #create_value (type, data)
    {
        const link = this.#create_link();
        
        const operation = this.#create_operation("create", [null, new Object(Object.typeof.value, type, data)], null);
        this.#add_to_link(link, operation, 0);

        return link;
    }

    #create_operation (type, operands, position)
    {
        const operation = this.#operations.length;

        this.#operations.push(new Operation(type, operands, position));

        return operation;
    }

    #create_variable (name, position)
    {
        const symbol_table = this.#scope_tree[this.#current_scope].symbol_table;

        if (symbol_table.has(name))
        {
            throw new Error(`second declaration of "${name}" at (${position.row}, ${position.column})`);
        }

        symbol_table.set(name, new Object(Object.typeof.variable, Object.typeof.null, null));
    }

    #get_object (name, position)
    {
        var scope = this.#current_scope;

        while (this.#scope_tree[scope].symbol_table.has(name) === false) 
        {
            scope = this.#scope_tree[scope].parent;

            if (scope === -1) 
            {
                throw new Error(`undeclared variable named "${name}" at (${position.row}, ${position.column})`);
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
        for (const object of operands)
        {
            if (index >= from + 1)
            {
                message += ", ";
            }
            if (index >= from) 
            {
                message += Object.data_name.get(object.type);
            }
            if (index >= to)
            {
                break;
            }
        }
        message += `] at (${position.row}, ${position.column})`;

        throw new Error(message);
    }

    #print (object)
    {
        switch (object.type)
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
                addOutput(String(object.data));   
            }
            break;

            case Object.typeof.array:
            {
                addOutput("[");

                for (const index in object.data)
                {
                    const element = object.data[index];
        
                    if (index > 0)
                    {
                        addOutput(", ");
                    }
        
                    this.#print(element);
                }
        
                addOutput("]");
            }
            break;

            default:
                console.log(`unknown type: ${object.type}, object ${object}`);
        }
    }

    async run () 
    {
        for (const objects of this.#links)
        {
            const link = new Object(Object.typeof,null, null);

            for (const object of objects)
            {
                const operation = object[0];
                const position  = object[1];

                this.operations[operation].operands[position] = link;
            }
        }


        this.#time_start = performance.now();
        
        // DEBUG    
        
        // if (this.#current_operation === 0)
        // {
        //     console.log(this.#operations);
        //     this.#print_data();
        //     console.log(this.#data);
            
        //     this.#return_jumps = [];
        // }
        
        // DEBUG

        var end = false;
        
        while (this.#current_operation < this.#operations.length)
        {
            const current_operation     = this.#operations[this.#current_operation];
            const operation_type        = current_operation.type;
            const operands              = current_operation.operands.slice();
            const position              = current_operation.position;

            // DEBUG

            // console.log(operation_type, Array(8 - operation_type.length + 1).join(' '), operands);

            // await new Promise(r => setTimeout(r, 1000)); // -----------------------PAUSE--------------------------------

            // this.#print_data("-------------------------------------------------------------");
            
            // DEBUG

            switch (operation_type)
            {
                case "if":
                {
                    // const bool_expression = operands[1];

                    // if (bool_expression.data === false)
                    // {
                    //     this.#current_operation = operands[0];
                    // }
                }
                break;
                case "jump":
                {
                    // this.#current_operation = operands[0];
                }
                break;

                case "=":   
                {
                    const object = operands[0];
                    const value = operands[1];

                    object.type = value.type;
                    object.data = structuredClone(value.data);
                }
                break;
                case "+=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.type === Object.typeof.array &&
                        value.type === Object.typeof.array 
                    )
                    {
                        var result = object.data;
                        result.push(...value.data);
                        
                        object.data = structuredClone(result);

                        break;
                    }
                    if (object.type === Object.typeof.null ||
                        value.type === Object.typeof.null ||
                        object.type === Object.typeof.array ||
                        value.type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    object.type = Math.max(object.type, value.type);
                    object.data += value.data;
                }
                break;
                case "-=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.type !== Object.typeof.bool &&
                        object.type !== Object.typeof.number ||
                        value.type !== Object.typeof.bool &&
                        value.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    object.type = Object.typeof.number;
                    object.data -= value.data;
                }
                break;
                case "*=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (value.type !== Object.typeof.number &&
                        value.type !== Object.typeof.bool ||
                        object.type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }

                    if (object.type === Object.typeof.array)
                    {
                        var number = value.data;
                        if (value.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (value.type === Object.typeof.bool) 
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...object.data);
                        }

                        object.type = Object.typeof.array;
                        object.data = structuredClone(array);

                        break;
                    }
                    if (object.type === Object.typeof.string)
                    {
                        var number = value.data;
                        if (value.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (value.type === Object.typeof.bool)
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += object.data;
                        }

                        object.type = Object.typeof.string;
                        object.data = structuredClone(string);

                        break;
                    }

                    object.type = Object.typeof.number;
                    object.data *= value.data;
                }
                break;
                case "/=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.type !== Object.typeof.number ||
                        value.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (value.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    object.type = Object.typeof.number;
                    object.data /= value.data;
                }
                break;
                case "//=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.type !== Object.typeof.number ||
                        value.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (value.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    object.type = Object.typeof.number;
                    object.data = Math.trunc(object.data / value.data);
                }
                break;
                case "%=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.type !== Object.typeof.number ||
                        value.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (value.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    object.type = Object.typeof.number;
                    object.data %= value.data;
                }
                break;

                case "print":
                {
                     for (const object of operands)
                     {
                        this.#print(object);
                     }
                }
                break;
                case "await":
                {
                    // var text = "Input";

                    // if (operands[0] !== -1)
                    // {
                    //     text = String(operands[0].data);
                    // }

                    // end = true;
                    // wait_for_input(text);
                }
                break;
                case "input":
                {
                    // const text = get_input();       

                    // this.#set(operands[0], Object.typeof.string, text);
                }
                break;

                case "isb":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.type = Object.typeof.bool;
                    result.data = value.type === Object.typeof.bool;
                }
                break;
                case "isn":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.type = Object.typeof.bool;
                    result.data = value.type === Object.typeof.number;
                }
                break;
                case "iss":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.type = Object.typeof.bool;
                    result.data = value.type === Object.typeof.string;
                }
                break;
                case "isa":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.type = Object.typeof.bool;
                    result.data = value.type === Object.typeof.array;
                }
                break;

                case "len":
                {
                    const result = operands[0];
                    const sequence = operands[1];

                    if (sequence.type !== Object.typeof.string &&
                        sequence.type !== Object.typeof.array
                    )
                    {
                        this.#evoke_error();
                    }

                    result.type = Object.typeof.number;
                    result.data = sequence.data.length;
                }
                break;

                case "slice":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];
                    // const op3 = this.#get(operands[3]);

                    // if (op1.type !== Object.typeof.string &&
                    //     op1.type !== Object.typeof.array ||
                    //     op2.type !== Object.typeof.number ||
                    //     op3.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], op1.type, op1.slice(op2.data, op3.data));
                }
                break;

                case "bool":
                {
                    // const value = operands[1];

                    // switch (op1.type)
                    // {
                    //     case Object.typeof.bool:
                    //     {
                    //         this.#set(operands[0], Object.typeof.bool, op1.data);
                    //     }
                    //     break;

                    //     case Object.typeof.number:
                    //     {
                    //         this.#set(operands[0], Object.typeof.bool, op1.data != 0);
                    //     }
                    //     break;

                    //     case Object.typeof.string:
                    //     {
                    //         this.#set(operands[0], Object.typeof.bool, op1.data === "true");
                    //     }
                    //     break;

                    //     default:
                    //         this.#evoke_error();
                    // }
                }
                break;

                case "num":
                {
                    // const op1 = operands[1];

                    // switch (op1.type)
                    // {
                    //     case Object.typeof.bool:
                    //     case Object.typeof.number:
                    //     case Object.typeof.string:
                    //     {
                    //         this.#set(operands[0], Object.typeof.number, Number(op1.data));
                    //     }
                    //     break;

                    //     default:
                    //         this.#evoke_error();
                    // }
                }
                break;

                case "str":
                {
                    // const op1 = operands[1];

                    // switch (op1.type)
                    // {
                    //     case Object.typeof.bool:
                    //     case Object.typeof.number:
                    //     case Object.typeof.string:
                    //     {
                    //         this.#set(operands[0], Object.typeof.string, String(op1.data));
                    //     }
                    //     break;

                    //     default:
                    //         this.#evoke_error();
                    // }
                }
                break;

                case "or":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data || op2.data);
                }
                break;
                case "and":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data && op2.data);
                }
                break;

                case "|":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data | op2.data);
                }
                break;
                case "^":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data ^ op2.data);
                }
                break;
                case "&":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data & op2.data);
                }
                break;

                case "==":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type === Object.typeof.null ||
                    //     op2.type === Object.typeof.null 
                    // )
                    // {
                    //     this.#set(operands[0], Object.typeof.bool, op1.type === op2.type);

                    //     break;
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data == op2.data);
                }
                break;
                case "!=":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type === Object.typeof.null ||
                    //     op2.type === Object.typeof.null 
                    // )
                    // {
                    //     this.#set(operands[0], Object.typeof.bool, op1.type !== op2.type);

                    //     break;
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data != op2.data);
                }
                break;
                case "===":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type === Object.typeof.null ||
                    //     op2.type === Object.typeof.null 
                    // )
                    // {
                    //     this.#set(operands[0], Object.typeof.bool, op1.type === op2.type);

                    //     break;
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data === op2.data);
                }
                break;
                case "!==":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type === Object.typeof.null ||
                    //     op2.type === Object.typeof.null 
                    // )
                    // {
                    //     this.#set(operands[0], Object.typeof.bool, op1.type === op2.type);

                    //     break;
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data !== op2.data);
                }
                break;

                case "<":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data < op2.data);
                }
                break;
                case ">":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data > op2.data);
                }
                break;
                case "<=":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data <= op2.data);
                }
                break;
                case ">=":
                {
                    // const op1 = operands[1];
                    // const op2 = operands[2];

                    // if (op1.type !== Object.typeof.bool &&
                    //     op1.type !== Object.typeof.number ||
                    //     op2.type !== Object.typeof.bool &&
                    //     op2.type !== Object.typeof.number
                    // )
                    // {
                    //     this.#evoke_error();
                    // }

                    // this.#set(operands[0], Object.typeof.bool, op1.data >= op2.data);
                }
                break;

                case "+":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.type === Object.typeof.array &&
                        op2.type === Object.typeof.array 
                    )
                    {
                        var array = op1.data;
                        array.push(...op2.data);
                        
                        result.type = Object.typeof.array;
                        result.data = structuredClone(array);

                        break;
                    }
                    if (op1.type === Object.typeof.null ||
                        op2.type === Object.typeof.null ||
                        op1.type === Object.typeof.array ||
                        op2.type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    result.type = Math.max(op1.type, op2.type);
                    result.data = op1.data + op2.data;
                }
                break;
                case "-":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.type = Object.typeof.number;
                    result.data = op1.data - op2.data;
                }
                break;

                case "*":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op2.type !== Object.typeof.number &&
                        op2.type !== Object.typeof.bool ||
                        op1.type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }

                    if (op1.type === Object.typeof.array)
                    {
                        var number = op2.data;
                        if (op2.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op2.type === Object.typeof.bool) 
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...op1.data);
                        }

                        result.type = Object.typeof.array;
                        result.data = structuredClone(array);

                        break;
                    }
                    if (op1.type === Object.typeof.string)
                    {
                        var number = op2.data;
                        if (op2.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op2.type === Object.typeof.bool)
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += op1.data;
                        }

                        result.type = Object.typeof.string;
                        result.data = string;

                        break;
                    }

                    result.type = Object.typeof.number;
                    result.data = op1.data * op2.data;
                }
                break;
                case "/":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    result.type = Object.typeof.number;
                    result.data = op1.data / op2.data;
                }
                break;
                case "//":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    result.type = Object.typeof.number;
                    result.data = Math.trunc(op1.data / op2.data);
                }
                break;
                case "%":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    result.type = Object.typeof.number;
                    result.data = op1.data % op2.data;
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