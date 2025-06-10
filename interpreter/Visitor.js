class Data
{
    type;
    data;

    static TYPEOF =
    {
        null        : 0,
        bool        : 1,
        number      : 2,
        string      : 3,
        array       : 4,

        ref        : 5,
        
        jump        : 6,
        
        class       : 7,
        object      : 8,
        
        function            : 9,
        default_function    : 10,
        method              : 11,
        default_method      : 12,
    }

    static DATA_NAME = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],

        [5, "ref"],
        
        [6, "jump"],
        
        [7, "class"],
        [8, "object"],
        
        [9, "func-n"],
        [10, "def_fun"],
        [11, "method"],
        [12, "def_mtd"],
    ])

    constructor (type, data)
    {
        this.type = type;
        this.data = data;
    }
}

class HeapData
{
    type;
    data;
    reference_count = 1;
    
    constructor (type, data)
    {
        this.type = type;
        this.data = data;
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

    static TYPEOF = {}
    static OPERATIONS =
    [
        "initialization",
        
        "break_point",

        "function",
        "parameter",
        "return",
        "get_return",

        "if",
        "ifn",
        "jump",

        "create",

        "=",
        "+=",
        "-=",
        "*=",
        "/=",
        "//=",
        "%=",

        "or",
        "and",

        "|",
        "^",
        "&",

        "==",
        "!=",
        "===",
        "!==",

        "<",
        "<=",
        ">",
        ">=",

        "+",
        "-",

        "*",
        "/",
        "//",
        "%",
        
        "un-",
        "not",

        "array_access",
        "slice",
        
        "member_access",
        
        "create_field",
        
        "this",
        "new_object",
        "pop_object",
        "get_object",

        "size",
        "push",
        "pop",
        "split",
        "join",
        "codeOfChar",
        
        "print",
        "println",
        "await",
        "input",
        "format",
        "clone",
        "rand",
        "clock",

        "is_null",
        "is_bool",
        "is_number",
        "is_string",
        "is_array",
        "is_object",
        "is_function",

        "to_bool",
        "to_number",
        "to_string",

        "exit",
    ]
    static OPERATION = [];
    
    static DEFAULT_FUNCTIONS = [
        "print",
        "println",
        "await",
        "input",
        "format",
        "clone",
        "rand",
        "clock",

        "is_null",
        "is_bool",
        "is_number",
        "is_string",
        "is_array",
        "is_object",
        "is_function",
    ];
    static DEFAULT_METHODS = [];
}
for (const INDEX in Operation.OPERATIONS)
{
    Operation.TYPEOF[Operation.OPERATIONS[INDEX]] = INDEX;
}
Operation.DEFAULT_METHODS[Data.TYPEOF.string] = new Set([
    "size",
    "split",
    "codeOfChar",
]);
Operation.DEFAULT_METHODS[Data.TYPEOF.array] = new Set([
    "size",
    "push",
    "pop",
    "join",
]);

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

class Visitor
{
    static VISIT_RULE = {}

    function_memory = [];
    function_stack = [];
    
    scope_tree     = [new Scope(-1)];
    current_scope  = 0;
    
    class_id = {};
    class_info = [];
    
    operations;

    constructor (operations)
    {
        this.operations = operations;
    }

    visit (parent, arg, child)
    {
        const NODE = parent.children[child - 1];

        if (Visitor.VISIT_RULE.hasOwnProperty(NODE.rule_name))
        {
            // DEBUG
            
            // console.log(`${NODE.rule_name}`) 
            
            // DEBUG
            return Visitor.VISIT_RULE[NODE.rule_name](this, NODE, arg);
        }
        else
        {
            console.log(`incorrect rulename: ${NODE.rule_name}`)
        }
    }
}



Visitor.VISIT_RULE["Program"] = 
function (visitor, node, arg)
{
    const SYMBOL_TABLE = visitor.scope_tree[visitor.current_scope].symbol_table;
    for (const NAME of Operation.DEFAULT_FUNCTIONS)
    {
        SYMBOL_TABLE.set(
            NAME, 
            new Data(
                Data.TYPEOF.default_function, 
                get_operation(NAME)
            )
        );
    }
    
    branch_scope(visitor);
    
    const INITIALIZATION = create_operation(
        visitor, 
        get_operation("initialization"), 
        [null, null], 
        null
    );

    const JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    const FUNCTION_ID = open_function(visitor);

    if (length_is(node, 2))
    {
        visitor.visit(node, {}, 1);
    }

    close_function(visitor);

    visitor.operations[JUMP].operands[0].data =
    create_operation(
        visitor, 
        get_operation("function"), 
        [
            new Data(
                Data.TYPEOF.function, 
                [
                    JUMP + 1, 
                    FUNCTION_ID
                ]
            ), 
            []
        ], 
        null
    );

    create_operation(
        visitor, 
        get_operation("exit"), 
        [], 
        null
    );

    visitor.operations[INITIALIZATION].operands[0] = visitor.function_memory;
}
Visitor.VISIT_RULE["Statements"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);

    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["Statement"] = 
function (visitor, node, arg)
{
    if (name_of(node, 1) === "Scope")
    {
        branch_scope(visitor);
        
        visitor.visit(node, arg, 1);
        
        leave_scope(visitor);
    }
    else
    {
        visitor.visit(node, arg, 1);
    }
}
Visitor.VISIT_RULE["BreakPoint"] = 
function (visitor, node, arg)
{
    create_operation(
        visitor, 
        get_operation("break_point"), 
        [get_position(node, 1)], 
        null
    );
}
Visitor.VISIT_RULE["Scope"] = 
function (visitor, node, arg)
{
    if (length_is(node, 3))
    {
        visitor.visit(node, arg, 2);
    }
}

Visitor.VISIT_RULE["Class"] = 
function (visitor, node, arg)
{
    const NAME          = visitor.visit(node, null, 2).string;
    const POSITION      = create_identifier(visitor, NAME);
    const PARAMETERS    = structuredClone(arg);
    const CLASS         = {};
    
    PARAMETERS.CLASS = CLASS;
    PARAMETERS.CONSTRUCTOR = false;
    PARAMETERS.ID = 1;
    
    const JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    const FUNCTION_ID   = open_function(visitor);
    CLASS["$"]          = new Data(
        Data.TYPEOF.function, 
        [
            JUMP + 1, 
            FUNCTION_ID
        ]
    );
        
    branch_scope(visitor);
    PARAMETERS.VISIT_COUNT = 1;
    visitor.visit(node, PARAMETERS, 4);
    
    PARAMETERS.VISIT_COUNT = 2;
    visitor.visit(node, PARAMETERS, 4);
    
    close_function(visitor);
    
    PARAMETERS.VISIT_COUNT = 3;
    visitor.visit(node, PARAMETERS, 4);
    leave_scope(visitor);
    
    visitor.operations[JUMP].operands[0].data = next_operation(visitor);
    
    const CLASS_VALUE = create_value(visitor, Data.TYPEOF.class, CLASS);
    create_operation(
        visitor,
        get_operation("="),
        [
            POSITION,
            CLASS_VALUE
        ],
        null
    );
}
Visitor.VISIT_RULE["ClassStatements"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
    
    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["ClassStatement"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["Constructor"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    
    if (PARAMETERS.VISIT_COUNT === 2)
    {
        if (PARAMETERS.CONSTRUCTOR)
        {
            const POSITION = get_position(node, 1);
            throw new Error(`constructor was declared twice at (${POSITION.row}, ${POSITION.column})`);
        }
        
        if (length_is(node, 4))
        {
            visitor.visit(node, PARAMETERS, 4);
        }
        else 
        {
            visitor.visit(node, null, 3);
            visitor.visit(node, PARAMETERS, 5);
        }
        
        PARAMETERS.CONSTRUCTOR = true;
    }
}
Visitor.VISIT_RULE["ClassMember"] = 
function (visitor, node, arg)
{
    const ID = visitor.visit(node, null, 1);
    
    visitor.visit(node, {ID : ID, PARAMETERS : arg}, 2);
}
Visitor.VISIT_RULE["$ClassMember"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["ClassField"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg.PARAMETERS;
    
    if (PARAMETERS.VISIT_COUNT === 1)
    {
        const CLASS     = PARAMETERS.CLASS;
        const ID        = arg.ID;
        const NAME      = ID.string;
        const POSITION  = ID.position;
        
        if (CLASS.hasOwnProperty(NAME))
        {
            throw new Error(`class member was declared second time at (${POSITION.row}, ${POSITION.column})`); 
        }
        CLASS[NAME] = PARAMETERS.ID++;
        
        if (length_is(node, 3))
        {
            create_operation(
                visitor,
                get_operation("create_field"),
                [
                    CLASS[NAME],
                    visitor.visit(node, null, 2),
                ],
                null
            );
        }
        else
        {
            create_operation(
                visitor,
                get_operation("create_field"),
                [
                    CLASS[NAME],
                    create_value(visitor, Data.TYPEOF.null, null),
                ],
                null
            );
        }
    }
}
Visitor.VISIT_RULE["ClassMethod"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg.PARAMETERS;
    
    if (PARAMETERS.VISIT_COUNT === 3)
    {
        const CLASS         = PARAMETERS.CLASS;
        const ID            = arg.ID;
        const NAME          = ID.string;
        const POSITION      = ID.position;
        
        if (CLASS.hasOwnProperty(NAME))
        {
            throw new Error(`class member was declared second time at (${POSITION.row}, ${POSITION.column})`); 
        }
        const FUNCTION_ID   = open_function(visitor);
        CLASS[NAME]         = new Data(
            Data.TYPEOF.method, 
            [
                next_operation(visitor), 
                FUNCTION_ID
            ]
        );
        
        branch_scope(visitor);
        
        if (length_is(node, 3))
        {
            visitor.visit(node, {}, 3);
        }
        else 
        {
            visitor.visit(node, null, 2);
            visitor.visit(node, {}, 4);
        }
        
        close_function(visitor);
        leave_scope(visitor);
    }
}

Visitor.VISIT_RULE["Function"] = 
function (visitor, node, arg)
{
    const ID            = visitor.visit(node, null, 2);
    const FUNCTION      = create_identifier(visitor, ID.string);
    const FUNCTION_ID   = open_function(visitor);
    const JUMP          = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    branch_scope(visitor);
    
    if (length_is(node, 5))
    {
        visitor.visit(node, {}, 5);
    }
    else 
    {
        visitor.visit(node, null, 4);
        visitor.visit(node, {}, 6);
    }
    
    close_function(visitor);
    
    visitor.operations[JUMP].operands[0].data = 
    create_operation(
        visitor,
        get_operation("="),
        [
            FUNCTION, 
            new Data(
                Data.TYPEOF.function, 
                [
                    JUMP + 1, 
                    FUNCTION_ID
                ]
            )
        ],
        null
    );
    
    leave_scope(visitor);
}
Visitor.VISIT_RULE["FunctionParameters"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 1);
    
    if (length_is(node, 2))
    {
        visitor.visit(node, null, 2);
    }
}
Visitor.VISIT_RULE["$FunctionParameters"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 2);
    
    if (length_is(node, 3))
    {
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["FunctionParameter"] = 
function (visitor, node, arg)
{
    const ID = visitor.visit(node, null, 1);
    
    create_identifier(visitor, ID.string, ID.position);
    
    if (length_is(node, 1))
    {
        create_operation(
            visitor,  
            get_operation("parameter"),
            [
                get_identifier(visitor, ID.string, ID.position),
                create_value(visitor, Data.TYPEOF.null, null)
            ],
            null
        );
    }
    if (length_is(node, 2))
    {
        create_operation(
            visitor,  
            get_operation("parameter"),
            [
                get_identifier(visitor, ID.string, ID.position),
                visitor.visit(node, null, 2),
            ],
            null
        );
    }
}
Visitor.VISIT_RULE["$FunctionParameter"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 2);
}

Visitor.VISIT_RULE["BoolExpression"] = 
function (visitor, node, arg)
{
    const RESULT        = create_position(visitor);
    const EXPRESSION    = visitor.visit(node, null, 1);

    create_operation(
        visitor, 
        get_operation("to_bool"), 
        [RESULT, EXPRESSION], 
        null
    );
    
    return RESULT;
}

Visitor.VISIT_RULE["Conditional"] = 
function (visitor, node, arg)
{
    const ARG_COPY          = structuredClone(arg);
    const BOOL_EXPRESSION   = visitor.visit(node, null, 3);
    const IF_JUMP           = create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    visitor.visit(node, ARG_COPY, 5);
    const SKIP_JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    visitor.operations[IF_JUMP].operands[1].data = next_operation(visitor);
    if (length_is(node, 6))
    {
        visitor.visit(node, ARG_COPY, 6);
    }
    
    visitor.operations[SKIP_JUMP].operands[0].data = next_operation(visitor);
}
Visitor.VISIT_RULE["ElseBlock"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 2);
}

Visitor.VISIT_RULE["Loop"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["While"] = 
function (visitor, node, arg)
{
    const SKIP_JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    const BREAK_JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    const CONTINUE_JUMP     = next_operation(visitor); 
    const BOOL_EXPRESSION   = visitor.visit(node, null, 3);
    
    visitor.operations[SKIP_JUMP].operands[0].data = CONTINUE_JUMP;
    create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, new Data(Data.TYPEOF.jump, BREAK_JUMP)], 
        null
    );
    
    const ARG_COPY      = structuredClone(arg);
    ARG_COPY.BREAK      = BREAK_JUMP;
    ARG_COPY.CONTINUE   = CONTINUE_JUMP;
    
    visitor.visit(node, ARG_COPY, 5);
    
    create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, CONTINUE_JUMP)], 
        null
    );
    
    visitor.operations[BREAK_JUMP].operands[0].data = next_operation(visitor);
}
Visitor.VISIT_RULE["For"] = 
function (visitor, node, arg)
{
    branch_scope(visitor);
    
    visitor.visit(node, null, 3);
    
    const SKIP_JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    const BREAK_JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    const CONTINUE_JUMP = next_operation(visitor); 
    visitor.visit(node, null, 7);
    visitor.operations[SKIP_JUMP].operands[0].data = next_operation(visitor);
    
    const BOOL_EXPRESSION = visitor.visit(node, null, 5);
    
    create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, new Data(Data.TYPEOF.jump, BREAK_JUMP)], 
        null
    );
    
    const ARG_COPY      = structuredClone(arg);
    ARG_COPY.BREAK      = BREAK_JUMP;
    ARG_COPY.CONTINUE   = CONTINUE_JUMP;
    
    visitor.visit(node, ARG_COPY, 9);
    
    create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, CONTINUE_JUMP)], 
        null
    );
    
    visitor.operations[BREAK_JUMP].operands[0].data = next_operation(visitor);
    
    leave_scope(visitor);
}
Visitor.VISIT_RULE["ExpressionOrDeclaration"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 1);
}
Visitor.VISIT_RULE["FlowControl"] = 
function (visitor, node, arg)
{
    const NAME = name_of(node, 1);

    switch (NAME)
    {
        case "continue":
        {
            create_operation(
                visitor, 
                get_operation("jump"), 
                [new Data(
                    Data.TYPEOF.jump,
                    arg.CONTINUE
                )], 
                null
            );
        }
        break;
        case "break":
        {
            create_operation(
                visitor, 
                get_operation("jump"), 
                [new Data(
                    Data.TYPEOF.jump,
                    arg.BREAK
                )], 
                null
            );
        }
        break;
        case "return":
        {
            if (length_is(node, 3))
            {
                create_operation(
                    visitor, 
                    get_operation("return"), 
                    [visitor.visit(node, null, 2)], 
                    null
                );
            }
            if (length_is(node, 2))
            {
                create_operation(
                    visitor, 
                    get_operation("return"), 
                    [create_value(visitor, Data.TYPEOF.null, null)], 
                    null
                );
            }
        }
        break;
    }
}

Visitor.VISIT_RULE["Declaration"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 2);

    if (length_is(node, 3))
    {
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["$Declaration"] =
function (visitor, node, arg)
{
    visitor.visit(node, null, 2);

    if (length_is(node, 3))
    {
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["SingleDeclaration"] = 
function (visitor, node, arg)
{
    const VARIABLE = visitor.visit(node, null, 1);
    create_identifier(visitor, VARIABLE.string, VARIABLE.position);

    if (length_is(node, 1))
    {
        create_operation(
            visitor,
            get_operation("="),
            [
                get_identifier(
                    visitor,
                    VARIABLE.string,
                    VARIABLE.position
                ),
                create_value(visitor, Data.TYPEOF.null, null)
            ],
            null
        );
    }
    if (length_is(node, 2))
    {
        create_operation(
            visitor,
            get_operation("="),
            [
                get_identifier(
                    visitor,
                    VARIABLE.string,
                    VARIABLE.position
                ),
                visitor.visit(node, null, 2)
            ],
            null
        );
    }
}
Visitor.VISIT_RULE["$SingleDeclaration"] =
function (visitor, node, arg)
{
    return visitor.visit(node, null, 2);;
}

Visitor.VISIT_RULE["Expressions"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 1);

    if (length_is(node, 2))
    {
        visitor.visit(node, null, 2);
    }
}
Visitor.VISIT_RULE["$Expressions"] =
function (visitor, node, arg)
{
    if (length_is(node, 3))
    {
        visitor.visit(node, null, 2);
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["Expression"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 1);
}
Visitor.VISIT_RULE["$Expression"] =
function (visitor, node, arg)
{
    return visitor.visit(node, null, 1);
}

Visitor.VISIT_RULE["AssignOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$AssignOp"] = 
function (visitor, node, arg)
{
    const LEFT  = arg;
    const RIGHT = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [LEFT, RIGHT], 
        get_position(node, 1)
    );

    return LEFT;
}

Visitor.VISIT_RULE["BoolOr"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BoolOr"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    
    const JUMP = create_operation(
        visitor, 
        get_operation("ifn"), 
        [LEFT, new Data(Data.TYPEOF.jump, null)], 
        get_position(node, 1)
    );
    
    const RIGHT = visitor.visit(node, null, 2);
    
    visitor.operations[JUMP].operands[1].data = 
    next_operation(visitor);

    create_operation(
        visitor, 
        get_operation("or"), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}
Visitor.VISIT_RULE["BoolAnd"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BoolAnd"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    
    const JUMP = create_operation(
        visitor, 
        get_operation("if"), 
        [LEFT, new Data(Data.TYPEOF.jump, null)], 
        get_position(node, 1)
    );
    
    const RIGHT = visitor.visit(node, null, 2);
    
    visitor.operations[JUMP].operands[1].data = 
    next_operation(visitor);

    create_operation(
        visitor, 
        get_operation("and"), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}

Visitor.VISIT_RULE["BitOr"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitOr"] =
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}
Visitor.VISIT_RULE["BitXor"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitXor"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}
Visitor.VISIT_RULE["BitAnd"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitAnd"] =
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["EqualOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$EqualOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["CompOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$CompOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["AddOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$AddOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}

Visitor.VISIT_RULE["MulOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$MulOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}

Visitor.VISIT_RULE["UnaryOp"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1);
    }
    
    const NAME      = name_of(node, 1);
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 2);
    
    switch (NAME)
    {
        case "-":
        {
            create_operation(
                visitor, 
                get_operation("un-"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );
        }
        break;
        
        case "not":
        {
            create_operation(
                visitor, 
                get_operation("not"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );
        }
        break;
    }
    
    return RESULT;
}

Visitor.VISIT_RULE["$Value"] = 
function (visitor, node, arg)
{
    const VALUE = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return VALUE;
    }

    return visitor.visit(node, VALUE, 2);
}
Visitor.VISIT_RULE["Accessing"] = 
function (visitor, node, arg)
{
    const OBJECT = visitor.visit(node, arg, 1);

    if (length_is(node, 1))
    {
        return OBJECT;
    }
    
    return visitor.visit(node, OBJECT, 2);
}
Visitor.VISIT_RULE["$Accessing"] = 
function (visitor, node, arg)
{
    const OBJECT = visitor.visit(node, arg, 1);

    if (length_is(node, 1))
    {
        return OBJECT;
    }
    
    return visitor.visit(node, OBJECT, 2);
}
Visitor.VISIT_RULE["SingleAccessing"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["SubscriptOrSlice"] = 
function (visitor, node, arg)
{
    if (length_is(node, 3))
    {
        const ELEMENT   = create_position(visitor);
        const ARRAY     = arg;
        const INDEX     = visitor.visit(node, null, 2);
        
        create_operation(
            visitor, 
            get_operation("array_access"),
            [ELEMENT, ARRAY, INDEX],
            get_position(node, 1)
        );

        return ELEMENT;
    }
    if (length_is(node, 4))
    {
        const SLICE     = create_position(visitor);
        const SEQUENCE  = arg;
        const BEGIN     = visitor.visit(node, null, 2);
        const END       = visitor.visit(node, null, 3);
        
        create_operation(
            visitor, 
            get_operation("slice"),
            [SLICE, SEQUENCE, BEGIN, END],
            get_position(node, 1)
        );

        return SLICE;
    }
}
Visitor.VISIT_RULE["Slice"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 2);
}
Visitor.VISIT_RULE["MemberAccessing"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const OBJECT    = arg;
    const ID        = visitor.visit(node, null, 2);
    const NAME      = ID.string; 
    const POSITION  = ID.position;
    
    create_operation(
        visitor, 
        get_operation("member_access"),
        [RESULT, OBJECT, NAME],
        POSITION
    );
    
    return RESULT;
}

Visitor.VISIT_RULE["Value"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1); 
    }

    return visitor.visit(node, null, 2); 
}

Visitor.VISIT_RULE["NewObject"] = 
function (visitor, node, arg)
{
    const PARAMETERS    = [];
    const ID            = visitor.visit(node, null, 2);
    const POSITION      = ID.position;
    const NAME          = ID.string;
    const CLASS         = get_identifier(visitor, NAME, POSITION);
    
    if (length_is(node, 5))
    {
        visitor.visit(node, PARAMETERS, 4);
    }
    
    create_operation(
        visitor, 
        get_operation("new_object"), 
        [
            CLASS,
            PARAMETERS,
        ], 
        null
    );
    
    const OBJECT = create_position(visitor);
    create_operation(
        visitor, 
        get_operation("get_object"), 
        [OBJECT], 
        null
    );
    
    return OBJECT;
}
Visitor.VISIT_RULE["This"] = 
function (visitor, node, arg)
{
    const OBJECT    = create_position(visitor);
    const POSITION  = get_position(node, 1);
    
    create_operation(
        visitor, 
        get_operation("this"), 
        [OBJECT], 
        POSITION
    );
    
    return OBJECT;
}

Visitor.VISIT_RULE["Variable"] = 
function (visitor, node, arg)
{
    const ID        = visitor.visit(node, null, 1);
    const NAME      = ID.string;
    const POSITION  = ID.position;
    
    return VARIABLE = get_identifier(visitor, NAME, POSITION);
}
Visitor.VISIT_RULE["id"] = 
function (visitor, node, arg)
{
    return node.children; 
}

Visitor.VISIT_RULE["FunctionCall"] = 
function (visitor, node, arg)
{
    const PARAMETERS    = [];
    const FUNCTION      = arg;
    
    if (length_is(node, 3))
    {
        visitor.visit(node, PARAMETERS, 2);
    }
    
    create_operation(
        visitor, 
        get_operation("function"), 
        [
            FUNCTION, 
            PARAMETERS
        ], 
        get_position(node, 1)
    );
    
    const RETURN_VALUE = create_position(visitor);
    create_operation(
        visitor, 
        get_operation("get_return"), 
        [RETURN_VALUE], 
        null
    );
    
    return RETURN_VALUE;
}


Visitor.VISIT_RULE["Parameters"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    if (length_is(node, 2))
    {
        visitor.visit(node, PARAMETERS, 2);
    }
    
    PARAMETERS.push(visitor.visit(node, null, 1));
}
Visitor.VISIT_RULE["$Parameters"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    if (length_is(node, 3))
    {
        visitor.visit(node, PARAMETERS, 3);
    }
    
    PARAMETERS.push(visitor.visit(node, null, 2));
}

Visitor.VISIT_RULE["Null"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.null, null);
}
Visitor.VISIT_RULE["Boolean"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1); 
    }

    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 3); 

    create_operation(
        visitor, 
        get_operation("to_bool"), 
        [RESULT, VALUE], 
        get_position(node, 1)
    );

    return RESULT;
}
Visitor.VISIT_RULE["true"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.bool, true);
}
Visitor.VISIT_RULE["false"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.bool, false);
}
Visitor.VISIT_RULE["Number"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1); 
    }
    
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 3); 

    create_operation(
        visitor, 
        get_operation("to_number"), 
        [RESULT, VALUE], 
        get_position(node, 1)
    );

    return RESULT;
}
Visitor.VISIT_RULE["number_token"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.number, Number(node.children.string));
}
Visitor.VISIT_RULE["String"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1); 
    }
    
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 3); 
    
    create_operation(
        visitor, 
        get_operation("to_string"), 
        [RESULT, VALUE], 
        get_position(node, 1)
    );

    return RESULT;
}
Visitor.VISIT_RULE["string_token"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.string, node.children.string);
}
Visitor.VISIT_RULE["Array"] = 
function (visitor, node, arg)
{
    const ARRAY = [];

    if (length_is(node, 3))
    {
        visitor.visit(node, ARRAY, 2);
    }

    return create_value(visitor, Data.TYPEOF.array, ARRAY);
}
Visitor.VISIT_RULE["$Array"] = 
function (visitor, node, arg)
{
    const ARRAY = arg;
    ARRAY.push(visitor.visit(node, null, 1));

    if (length_is(node, 2))
    {
        visitor.visit(node, ARRAY, 2);
    }
}
Visitor.VISIT_RULE["$$Array"] = 
function (visitor, node, arg)
{
    const ARRAY = arg;
    ARRAY.push(visitor.visit(node, null, 2));

    if (length_is(node, 3))
    {
        visitor.visit(node, ARRAY, 3);
    }
}



function length_is (node, length)
{
    return length === node.children.length;
}
function name_of (node, child)
{
    return node.children[child - 1].rule_name;
}

function get_position (node, child)
{
    return node.children[child - 1].children.position;
}

function get_operation (node, child = null)
{
    let name = node;
    if (child !== null)
    {
        name = node.children[child - 1].children.type;
    }
    
    if (Operation.TYPEOF.hasOwnProperty(name) === false)
    {
        throw new Error(`no operation named ${name}`);
    }

    // CHANGE
    return Operation.OPERATION[Operation.TYPEOF[name]];
    // return Operation.TYPEOF[name];
}

function open_function (visitor)
{
    const FUNCTION_ID = visitor.function_memory.length;

    visitor.function_stack.push(FUNCTION_ID);
    visitor.function_memory[FUNCTION_ID] = 0;
    
    return FUNCTION_ID;
}
function close_function (visitor)
{
    create_operation(
        visitor, 
        get_operation("return"), 
        [
            create_value(
                visitor, 
                Data.TYPEOF.null, 
                null
            )
        ],
        null
    );

    visitor.function_stack.pop();
}
function current_function (visitor)
{
    return visitor.function_stack.at(-1);
}

function create_position (visitor)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    return new Data(Data.TYPEOF.ref, POSITION);
}
function create_value (visitor, type, data)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    create_operation(
        visitor, 
        get_operation("create"), 
        [
            new Data(
                Data.TYPEOF.ref,
                POSITION
            ), 
            type, 
            data
        ], 
        null
    );

    return new Data(Data.TYPEOF.ref, POSITION);
}
function copy_value (visitor, type, data)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    create_operation(
        visitor, 
        get_operation("copy"), 
        [
            new Data(
                Data.TYPEOF.ref,
                POSITION
            ), 
            type, 
            data
        ], 
        null
    );

    return new Data(Data.TYPEOF.ref, POSITION);
}
function $create_value (visitor, type, data)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    const OPERATION = create_operation(
        visitor, 
        get_operation("create"), 
        [
            new Data(
                Data.TYPEOF.ref,
                POSITION
            ), 
            type, 
            data
        ], 
        null
    );

    return {
        VALUE       : new Data(Data.TYPEOF.ref, POSITION), 
        OPERATION   : OPERATION
    };
}

function create_operation (visitor, type, operands, position)
{
    visitor.operations.push(new Operation(type, operands, position));

    return visitor.operations.length - 1;
}
function current_operation (visitor)
{
    return visitor.operations.length - 1;
}
function next_operation (visitor)
{
    return visitor.operations.length;
}

function create_identifier (visitor, name)
{
    const SYMBOL_TABLE = visitor.scope_tree[visitor.current_scope].symbol_table;

    if (SYMBOL_TABLE.has(name) == false)
    {
        SYMBOL_TABLE.set(name, create_position(visitor));
    }
    
    return SYMBOL_TABLE.get(name);
}
function get_identifier (visitor, name, position)
{
    let scope = visitor.current_scope;

    while (visitor.scope_tree[scope].symbol_table.has(name) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared identifier "${name}" at (${position.row}, ${position.column})`);
        }
    }

    return visitor.scope_tree[scope].symbol_table.get(name);
}

function branch_scope (visitor)
{
    const PREVIOUS_SCOPE = visitor.current_scope;
    visitor.current_scope = visitor.scope_tree.length;

    visitor.scope_tree.push(new Scope(PREVIOUS_SCOPE));
}
function leave_scope (visitor)
{
    visitor.current_scope = visitor.scope_tree[visitor.current_scope].parent;
}