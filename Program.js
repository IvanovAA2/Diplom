
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

        ref     :5,
    }

    static data_name = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],
    ])

    static symbol_name = new Map
    ([
        [0, "var"],
        [1, "func"],
        [2, "value"],
    ])

    constructor (symbol_type, type, data)
    {
        this.symbol_type    = symbol_type;
        this.type           = type;
        this.data           = data;
    }

    assign (data, position)
    {
        if (data[position].type === Object.typeof.array)
        {
            this.type = Object.typeof.ref;
            this.data = position;

            return;
        }
        if (data[position].type === Object.typeof.ref)
        {
            position = data[position].data;
        }
        this.type = data[position].type;
        this.data = data[position].data;
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

    constructor (parse_tree) 
    {
        this.#parse_tree = parse_tree;

        this.#generate_program();
    }

    #visitor (node, arg)
    {
        console.log(node.rule_name);

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

            case "Declaration" :
            case "$Declaration" : // "," "SingleDeclaration" "$Declaration"
            {
                if (node.children[1].rule_name === "id") 
                {
                    const variable_name = node.children[1].children.string;
                    const position      = node.children[1].children.position;

                    this.#create_reference(variable_name, this.#copy_value(this.#add_value(Object.typeof.null)), position);
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

                this.#create_reference(variable_name, this.#visitor(node.children[1]), position);
            }
            break;
            case "$SingleDeclaration" :
            {
                return this.#visitor(node.children[1]);
            }

            case "ReferenceDeclaration":
            case "$ReferenceDeclaration":
            {
                this.#visitor(node.children[1]);

                if (node.children.length == 3)
                {
                    this.#visitor(node.children[2]);
                }
            }
            break;
            case "SingleReferenceDeclaration":
            {
                const reference_name    = node.children[0].children.string;
                const position          = node.children[0].children.position;

                this.#create_reference(reference_name, this.#visitor(node.children[2]), position);
            }
            break;

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
                const position = node.children[0].children.position;

                this.#add_operation("=", [arg, this.#visitor(node.children[1])], position);
                        
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
            case "$Accessing":
            {
                return this.#visitor(node.children[1], this.#visitor(node.children[0], arg));
            }
            case "Value":
            {
                if (node.children.length === 3) // "(" Expression ")"
                {
                    return this.#visitor(node.children[1]);
                }

                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }

            case "null":
            {
                return this.#copy_value(this.#add_value(Object.typeof.null));
            }
            case "true":
            {
                return this.#copy_value(this.#add_value(Object.typeof.bool, true));
            }
            case "false":
            {
                return this.#copy_value(this.#add_value(Object.typeof.bool, false));
            }
            case "numberToken":
            {
                return this.#copy_value(this.#add_value(Object.typeof.number, Number(node.children.string)));
            }
            case "stringToken":
            {
                return this.#copy_value(this.#add_value(Object.typeof.string, node.children.string));
            }
            case "Array":
            {
                if (node.children.length === 2) // "[" "]"
                {
                    return this.#copy_value(this.#add_value(Object.typeof.array, []));
                }
                // "[" "$Array" "]"
                if (node.children[1].rule_name === "$Array")
                {
                    return this.#copy_value(this.#add_value(Object.typeof.array, this.#visitor(node.children[1])));
                }

                return this.#copy_value(this.#add_value(Object.typeof.array, [this.#visitor(node.children[1])]));
            }
            case "$Array":
            {
                var array = [this.#visitor(node.children[0])];

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], array);
                }

                return array;
            }
            case "$$Array":
            {
                arg.push(this.#visitor(node.children[1]));

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg); 
                }
            }
            break;

            case "Accessing":
            {
                if (node.children.length === 3)
                {
                    const destination = this.#add_value(Object.typeof.ref);

                    this.#add_operation(
                        "arac", 
                        [
                            destination, 
                            arg, 
                            this.#visitor(node.children[1])
                        ], 
                        node.children[0].children.position
                    );

                    return destination;
                }

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

                return destination;
            }
            case "StringAccessing":
            {
                return this.#visitor(node.children[1]);
            }

            case "bool":
            {
                const destination       = this.#add_value(Object.typeof.bool);
                const position          = node.children[0].children.position;
                
                this.#add_operation("bool", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }
            case "number":
            {
                const destination       = this.#add_value(Object.typeof.number);
                const position          = node.children[0].children.position;
                
                this.#add_operation("num", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }
            case "string":
            {
                const destination       = this.#add_value(Object.typeof.string);
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

            case "$id": // function call
            {
                const destination = this.#add_value();
                // TODO
                return destination;
            }

            case "DefaultFunctionCall":
            {
                const position  = node.children.position;
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

                switch (node.children[0].rule_name)
                {
                    case "print":
                    {
                        this.#add_operation("print", parameters, position);

                        return this.#add_value();
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

    #add_value (type = Object.typeof.null, data = null)
    {
        const position = this.#data.length;

        this.#data.push(new Object(Object.typeof.value, type, structuredClone(data)));

        return position;
    }

    #copy_variable (from)
    {
        const destination = this.#data.length;

        this.#data.push(new Object(Object.typeof.variable, Object.typeof.null, null));
        this.#add_operation("copy", [destination, from], null);

        return destination;
    }

    #copy_value (from)
    {
        const destination = this.#data.length;

        this.#data.push(new Object(Object.typeof.value, Object.typeof.null, null));
        this.#add_operation("copy", [destination, from], null);

        return destination;
    }

    #add_operation (type, operands, position)
    {
        this.#operations.push(new Operation(type, operands, position));
    }

    #create_reference (name, index, position)
    {
        if (this.#scope_tree[this.#current_scope].symbol_table.has(name))
        {
            throw new Error(`multiple initializations of "${name}" at (${position.row}, ${position.column})`);
        }

        const variable_position = this.#data.length;
        this.#data.push(new Object(Object.typeof.variable, Object.typeof.ref, index));

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

    #evoke_error (from = 1)
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
                message += Object.nameof.get(this.#data[operands[index]].type);
            }
        }
        message += `] at (${position.row}, ${position.column})`;

        throw new Error(message);
    }

    #get_position (position)
    {
        if (this.#data[position].type === Object.typeof.ref)
        {
            return this.#data[position].data;
        }
        
        return position;
    }

    run () 
    {
        for(const x in this.#data)
        {
            console.log(`${x}: ${Object.symbol_name.get(this.#data[x].symbol_type)} \t${Object.data_name.get(this.#data[x].type)} \t${this.#data[x].data}`);
        }
        for(const x of this.#operations)
        {
            console.log(`${x.type} ${x.operands}`);
        }

        this.#return_jumps = [];

        while (this.#current_operation < this.#operations.length)
        {
            const current_operation     = this.#operations[this.#current_operation];
            const operation_type        = current_operation.type;
            const operands              = current_operation.operands;
            const position              = current_operation.position;

            switch (operation_type)
            {
                case "=":
                {
                    this.#data[this.#get_position(operands[0])].assign(this.#data, this.#get_position(operands[1]));
                }
                break;
                case "copy":
                {
                    this.#data[this.#get_position(operands[0])].type = this.#data[this.#get_position(operands[1])].type;
                    this.#data[this.#get_position(operands[0])].data = structuredClone(this.#data[this.#get_position(operands[1])].data);
                }
                break;

                case "print":
                {
                     for (const element of operands)
                     {
                        const position = this.#get_position(element);

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
                                    const ref = this.#get_position(this.#data[position].data[index]);

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

                case "bool":
                {
                    switch (this.#data[this.#get_position(operands[1])].type)
                    {
                        case Object.typeof.bool:
                        {
                            this.#data[this.#get_position(operands[0])].data = this.#data[this.#get_position(operands[1])].data;
                        }
                        break;

                        case Object.typeof.number:
                        {
                            this.#data[this.#get_position(operands[0])].data = this.#data[this.#get_position(operands[1])].data !== 0;
                        }
                        break;

                        case Object.typeof.string:
                        {
                            this.#data[this.#get_position(operands[0])].data = this.#data[this.#get_position(operands[1])].data === "true";
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }

                case "num":
                {
                    switch (this.#data[this.#get_position(operands[1])].type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            this.#data[this.#get_position(operands[0])].data = Number(this.#data[this.#get_position(operands[1])].data);
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }

                case "str":
                {
                    switch (this.#data[this.#get_position(operands[1])].type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            this.#data[this.#get_position(operands[0])].data = String(this.#data[this.#get_position(operands[1])].data);
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }

                case "slice":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.string &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.arary ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[3])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = 
                    this.#data[this.#get_position(operands[1])].type;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data.slice(
                        this.#data[this.#get_position(operands[2])].data,
                        this.#data[this.#get_position(operands[3])].data
                    );
                }
                break;

                case "arac":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.array ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[operands[0]].data = 
                    this.#data[this.#get_position(operands[1])].data[this.#data[this.#get_position(operands[2])].data];
                }
                break;

                case "or":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data || this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "and":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data && this.#data[this.#get_position(operands[2])].data;
                }
                break;

                case "|":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data | this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "^":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data ^ this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "&":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data & this.#data[this.#get_position(operands[2])].data;
                }
                break;

                case "==":
                {
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.null ||
                        this.#data[this.#get_position(operands[2])].type === Object.typeof.null 
                    )
                    {
                        this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                        this.#data[this.#get_position(operands[0])].data = 
                        this.#data[this.#get_position(operands[1])].type === this.#data[this.#get_position(operands[2])].type;

                        break;
                    }
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.array ||
                        this.#data[this.#get_position(operands[2])].type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data === this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "!=":
                {
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.null ||
                        this.#data[this.#get_position(operands[2])].type === Object.typeof.null 
                    )
                    {
                        this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                        this.#data[this.#get_position(operands[0])].data = 
                        this.#data[this.#get_position(operands[1])].type !== this.#data[this.#get_position(operands[2])].type;

                        break;
                    }
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.array ||
                        this.#data[this.#get_position(operands[2])].type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }
                    
                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data !== this.#data[this.#get_position(operands[2])].data;
                }
                break;

                case "<":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data < this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case ">":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data > this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "<=":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data <= this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case ">=":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.bool;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data >= this.#data[this.#get_position(operands[2])].data;
                }
                break;

                case "+":
                {
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.null ||
                        this.#data[this.#get_position(operands[2])].type === Object.typeof.null ||
                        this.#data[this.#get_position(operands[1])].type === Object.typeof.array ||
                        this.#data[this.#get_position(operands[2])].type === Object.typeof.array
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = 
                    Math.max(this.#data[this.#get_position(operands[1])].type, this.#data[this.#get_position(operands[2])].type);
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data + this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "-":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data - this.#data[this.#get_position(operands[2])].data;
                }
                break;

                case "*":
                {
                    if (this.#data[this.#get_position(operands[2])].type !== Object.typeof.number &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.bool ||
                        this.#data[this.#get_position(operands[1])].type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.array)
                    {
                        var number = this.#data[this.#get_position(operands[2])].data;
                        if (this.#data[this.#get_position(operands[2])].type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        else
                        {
                            number = Number(number);
                        }
                        this.#data[this.#get_position(operands[0])].type = Object.typeof.array;
                        this.#data[this.#get_position(operands[0])].data = [];

                        for (var count = 0; count < number; ++count)
                        {
                            this.#data[this.#get_position(operands[0])].data.push(...this.#data[this.#get_position(operands[1])].data);
                        }

                        break;
                    }
                    if (this.#data[this.#get_position(operands[1])].type === Object.typeof.string)
                    {
                        var number = this.#data[this.#get_position(operands[2])].data;
                        if (this.#data[this.#get_position(operands[2])].type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        else
                        {
                            number = Number(number);
                        }
                        this.#data[this.#get_position(operands[0])].type = Object.typeof.string;
                        this.#data[this.#get_position(operands[0])].data = "";

                        for (var count = 0; count < number; ++count)
                        {
                            this.#data[this.#get_position(operands[0])].data += this.#data[this.#get_position(operands[1])].data;
                        }

                        break;
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    this.#data[this.#get_position(operands[1])].data * this.#data[this.#get_position(operands[2])].data;
                }
                break;
                case "/":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[this.#get_position(operands[2])].data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    Number(this.#data[this.#get_position(operands[1])].data) / Number(this.#data[this.#get_position(operands[2])].data);
                }
                break;
                case "//":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[1])].type !== Object.typeof.bool &&
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[this.#get_position(operands[2])].data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    Math.trunc(Number(this.#data[this.#get_position(operands[1])].data) / Number(this.#data[this.#get_position(operands[2])].data));
                }
                break;
                case "%":
                {
                    if (this.#data[this.#get_position(operands[1])].type !== Object.typeof.number ||
                        this.#data[this.#get_position(operands[2])].type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (this.#data[this.#get_position(operands[2])].data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#data[this.#get_position(operands[0])].type = Object.typeof.number;
                    this.#data[this.#get_position(operands[0])].data = 
                    Number(this.#data[this.#get_position(operands[1])].data) % Number(this.#data[this.#get_position(operands[2])].data);
                }
                break;
            }

            ++this.#current_operation;
        }
    }
}