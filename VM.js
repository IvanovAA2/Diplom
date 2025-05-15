class Program
{
    operations = [];
    
    current_operation;
    
    function_memory;

    stack;
    heap;
    free_memory;

    function_offset;
    parameter_stack;
    jump_back;
    return_value;
    
    object_stack;

    time_start;
    overall_time;

    is_end;

    constructor (parse_tree) 
    {
        const VISITOR = new Visitor(this.operations);

        Visitor.VISIT_RULE["Program"](VISITOR, parse_tree, null);
    }

    run (first_run = true)
    {
        if (first_run)
        {
            this.current_operation  = 0;

            this.stack              = [];
            this.heap               = [];
            this.free_memory        = [];

            this.parameter_stack    = [];
            this.jump_back          = [];
            this.return_value       = new Data(null, null);
            
            this.object_stack       = [];

            this.overall_time       = 0;

            // DEBUG

            var text = "", cnt = -1;

            for (const OPERATION of this.operations)
            {
                text += `${cnt += 1} \t${Operation.OPERATIONS[OPERATION.type]}: \t`;

                for (const OPERAND of OPERATION.operands)
                {
                    if (OPERAND && OPERAND.hasOwnProperty("data"))
                    {
                        if (OPERAND.type === Data.TYPEOF.string)
                        {
                            text += `(${Data.DATA_NAME.get(OPERAND.type)}: "${OPERAND.data})" `;
                        }
                        else if (OPERAND.type === Data.TYPEOF.array)
                        {
                            text += `(${Data.DATA_NAME.get(OPERAND.type)}: [`;
                            
                            for (const ELEMENT of OPERAND.data)
                            {
                                text += `${ELEMENT.data} `;
                            }
                            
                            text += "\b] ";
                        }
                        else
                        {
                            text += `(${Data.DATA_NAME.get(OPERAND.type)}: ${OPERAND.data}) `;
                        }
                    }
                    else
                    {
                        text += OPERAND + " ";
                    }
                }

                text += "\n";

            }
            console.log(text);

            // DEBUG
        }

        this.time_start = performance.now();
        this.is_end     = false;

        while (this.current_operation < this.operations.length && this.is_end === false)
        {
            // await new Promise(r => setTimeout(r, 200));

            const OPERATION = this.operations[this.current_operation];

            // DEBUG
            
            var text = `!!!!!!!!!!!!!!!!!\n${this.current_operation} \t${Operation.OPERATIONS[OPERATION.type]} (${OPERATION.type}): `;
            for (const OPERAND of OPERATION.operands)
            {
                if (OPERAND && OPERAND.hasOwnProperty("data"))
                {
                    if (OPERAND.type === Data.TYPEOF.string)
                    {
                        text += `(${Data.DATA_NAME.get(OPERAND.type)}: "${OPERAND.data})" `;
                    }
                    else if (OPERAND.type === Data.TYPEOF.array)
                    {
                        text += `(${Data.DATA_NAME.get(OPERAND.type)}: [ `;
                        
                        for (const ELEMENT of OPERAND.data)
                        {
                            text += `${ELEMENT.data} `;
                        }
                        
                        text += "] ";
                    }
                    else
                    {
                        text += `(${Data.DATA_NAME.get(OPERAND.type)}: ${OPERAND.data}) `;
                    }
                }
                else if (OPERAND && OPERAND.hasOwnProperty("$"))
                {
                    text += `class\n`;
                        
                    for (const NAME in OPERAND)
                    {
                        text += `${NAME} : ${OPERAND[NAME]}\n`;
                    }
                }
                else
                {
                    text += OPERAND + " ";
                }
            }
            console.log(text);
            
            // DEBUG
            
            Operation.OPERATION[OPERATION.type](this, OPERATION.operands);
            // OPERATION.type(this, OPERATION.operands);

            this.current_operation += 1;
        }

        this.overall_time += performance.now() - this.time_start;
    }
}

Operation.OPERATION[Operation.TYPEOF["initialization"]] =
function (program, operands)
{
    const LENGTH = operands[0].length;
    program.function_offset = [];
    for (var i = 0; i < LENGTH; i += 1)
    {
        program.function_offset.push([])
    }
    
    program.function_memory = operands[0];
}

Operation.OPERATION[Operation.TYPEOF["function"]] =
function (program, operands)
{
    const FUNCTION = get(program, operands[0]).data;
    const FUNCTION_ID = FUNCTION[1];
    const JUMP = FUNCTION[0] - 1;
    
    const PARAMETERS = structuredClone(operands[1]);
    for (var object of PARAMETERS)
    {
        object = sget(program, object);
    }
    program.parameter_stack.push(PARAMETERS);
    
    program.function_offset[FUNCTION_ID].push(program.stack.length);
    program.jump_back.push([program.current_operation + 1, FUNCTION_ID]);
    for (var i = 0; i < program.function_memory[FUNCTION_ID]; i += 1)
    {
        program.stack.push(new Data(Data.TYPEOF.null, null));
    }
    
    program.current_operation = JUMP;
}
Operation.OPERATION[Operation.TYPEOF["parameter"]] =
function (program, operands)
{
    const PARAMETERS    = program.parameter_stack.at(-1);
    const PARAMETER     = sget(program, operands[0]);
    
    if (PARAMETERS.length > 0)
    {
        allocate_from(program, PARAMETER, PARAMETERS.pop());
    }
    else
    {
        allocate_from(program, PARAMETER, operands[1]);
    }
}
Operation.OPERATION[Operation.TYPEOF["return"]] =
function (program, operands)
{
    const VALUE = sget(program, operands[0]);

    program.return_value = VALUE;

    if (VALUE.type === Data.TYPEOF.dref)
    {
        program.heap[VALUE.data].reference_count += 1;
    }
    
    const FUNCTION_ID = program.jump_back.at(-1)[1];
    const NEW_SIZE = program.function_offset[FUNCTION_ID].pop();
    program.current_operation = program.jump_back.at(-1)[0] - 1;
    for (var position = NEW_SIZE; position < program.stack.length; position += 1)
    {
        deallocate(program, program.stack.pop());
    }

    program.jump_back.pop();
    program.parameter_stack.pop();
}
Operation.OPERATION[Operation.TYPEOF["get_return"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const RETURN_VALUE  = program.return_value;
    
    allocate_from(program, RESULT, RETURN_VALUE);
    
    deallocate(program, RETURN_VALUE);
}

Operation.OPERATION[Operation.TYPEOF["if"]] =
function (program, operands)
{
    const BOOL_EXPRESSION   = get(program, operands[0]);
    const JUMP              = get(program, operands[1]);
    
    if (BOOL_EXPRESSION.data === false)
    {
        program.current_operation = JUMP.data - 1;
    }
}
Operation.OPERATION[Operation.TYPEOF["ifn"]] =
function (program, operands)
{
    const BOOL_EXPRESSION   = get(program, operands[0]);
    const JUMP              = get(program, operands[1]);
    
    if (BOOL_EXPRESSION.data === true)
    {
        program.current_operation = JUMP.data - 1;
    }
}
Operation.OPERATION[Operation.TYPEOF["jump"]] =
function (program, operands)
{
    const JUMP = get(program, operands[0]);

    program.current_operation = JUMP.data - 1;
}

Operation.OPERATION[Operation.TYPEOF["create"]] =
function (program, operands)
{
    const POSITION  = operands[0];
    const OFFSET    = program.function_offset[POSITION[0]].at(-1);

    allocate(
        program, 
        program.stack[OFFSET + POSITION[1]],
        operands[1], 
        operands[2]
    );
}

Operation.OPERATION[Operation.TYPEOF["="]] =
function (program, operands)
{
    const OBJECT    = operands[0];
    const VALUE     = operands[1];

    allocate_from(program, OBJECT, VALUE);
}
Operation.OPERATION[Operation.TYPEOF["+="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type === Data.TYPEOF.null ||
        OBJECT.type === Data.TYPEOF.array ||
        VALUE.type === Data.TYPEOF.null ||
        VALUE.type === Data.TYPEOF.array
    )
    {
        evoke_error(program);
    }

    if (OBJECT.type === Data.TYPEOF.string ||
        VALUE.type === Data.TYPEOF.string
    )
    {
        OBJECT.type = Data.TYPEOF.string;
    }
    else
    {
        OBJECT.type = Data.TYPEOF.number;
    }
    OBJECT.data += VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["-="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data -= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["*="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    if (OBJECT.type === Data.TYPEOF.string)
    {
        if (VALUE.type !== Data.TYPEOF.number)
        {
            evoke_error(program);
        }
        
        OBJECT.data = OBJECT.data.repeat(VALUE.data);
        
        return;
    }
    if (OBJECT.type === Data.TYPEOF.array)
    {
        if (VALUE.type !== Data.TYPEOF.number)
        {
            evoke_error(program);
        }
        
        const ARRAY = [];
        for (var i = 0; i < VALUE.data; i += 1)
        {
            for (const ELEMENT of OBJECT.data)
            {
                const DREF      = sget(program, ELEMENT); 
                const MIDPOINT  = new Data(Data.TYPEOF.null, null);
                
                allocate_from(program, MIDPOINT, DREF);
                
                ARRAY.push(MIDPOINT);
                
                program.heap[DREF.data].reference_count += 1;
            }
        }
        
        allocate(
            program,
            OBJECT,
            Data.TYPEOF.array, 
            ARRAY
        );
        
        return;
    }

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data *= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["/="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data /= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["//="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data = Math.trunc(OBJECT.data / VALUE.data);
}
Operation.OPERATION[Operation.TYPEOF["%="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data %= VALUE.data;
}

Operation.OPERATION[Operation.TYPEOF["or"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);
    
    if (to_bool(program, LEFT) === true)
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            true
        );
    }
    else
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            to_bool(program, RIGHT)
        );
    }
}
Operation.OPERATION[Operation.TYPEOF["and"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (to_bool(program, LEFT) === false)
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            false
        );
    }
    else
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            to_bool(program, RIGHT)
        );
    }
}

Operation.OPERATION[Operation.TYPEOF["|"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,       
        Data.TYPEOF.bool, 
        LEFT.data | RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["^"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data ^ RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["&"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data & RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["=="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data == RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["!="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data != RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["==="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data === RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["!=="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data !== RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["<"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data < RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["<="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data <= RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF[">"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data > RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF[">="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data >= RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["+"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.null ||
        LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.null ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    if (LEFT.type === Data.TYPEOF.string ||
        RIGHT.type === Data.TYPEOF.string
    )
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.string, 
            LEFT.data + RIGHT.data
        );
    }
    else
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.number, 
            LEFT.data + RIGHT.data
        );
    }
}
Operation.OPERATION[Operation.TYPEOF["-"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.bool &&
        LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.bool &&
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data - RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["*"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);
    
    if (LEFT.type === Data.TYPEOF.string)
    {
        if (RIGHT.type !== Data.TYPEOF.number)
        {
            evoke_error(program, 0);
        }
        
        allocate(
            program,
            RESULT,
            Data.TYPEOF.string, 
            LEFT.data.repeat(RIGHT.data)
        );
        
        return;
    }
    if (LEFT.type === Data.TYPEOF.array)
    {
        if (RIGHT.type !== Data.TYPEOF.number)
        {
            evoke_error(program, 0);
        }
        
        const ARRAY = [];
        for (var i = 0; i < RIGHT.data; i += 1)
        {
            for (const ELEMENT of LEFT.data)
            {
                const DREF      = sget(program, ELEMENT); 
                const MIDPOINT  = new Data(Data.TYPEOF.null, null);
                
                allocate_from(program, MIDPOINT, DREF);
                
                ARRAY.push(MIDPOINT);
                
                program.heap[DREF.data].reference_count += 1;
            }
        }
        
        allocate(
            program,
            RESULT,
            Data.TYPEOF.array, 
            ARRAY
        );
        
        return;
    }

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data * RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["/"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data / RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["//"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        Math,trunc(LEFT.data / RIGHT.data)
    );
}
Operation.OPERATION[Operation.TYPEOF["%"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data % RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["un-"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (VALUE.type !== Data.TYPEOF.number)
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number,
        -VALUE.data
    );
}
Operation.OPERATION[Operation.TYPEOF["not"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        ! to_bool(program, VALUE)
    );
}

Operation.OPERATION[Operation.TYPEOF["array_access"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const ARRAY     = get(program, operands[1]);
    const INDEX     = get(program, operands[2]);
    
    if (ARRAY.type !== Data.TYPEOF.array ||
        INDEX.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }
    if (INDEX.data < 0 ||
        INDEX.data >= ARRAY.data.length ||
        INDEX.data % 1 != 0)
    {
        evoke_error_message(program, "trying to access float index or out of bounds");
    }
    
    const ELEMENT = ARRAY.data[INDEX.data];
    
    deallocate(program, RESULT);
    program.heap[ELEMENT.data].reference_count += 1;
    
    RESULT.type = ELEMENT.type;
    RESULT.data = ELEMENT.data;
}
Operation.OPERATION[Operation.TYPEOF["slice"]] =
function (program, operands)
{
    const SLICE     = sget(program, operands[0]);
    const SEQUENCE  = get(program, operands[1]);
    const BEGIN     = get(program, operands[2]);
    const END       = get(program, operands[3]);
    
    if (SEQUENCE.type !== Data.TYPEOF.string &&
        SEQUENCE.type !== Data.TYPEOF.array ||
        BEGIN.type !== Data.TYPEOF.number ||
        END.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }
    
    if (SEQUENCE.type === Data.TYPEOF.string)
    {
        allocate(
            program,
            SLICE,
            Data.TYPEOF.string,
            SEQUENCE.data.slice(BEGIN.data, END.data)
        );
    }
    if (SEQUENCE.type !== Data.TYPEOF.array)
    {
        const ARRAY = [];
        
        for (const ELEMENT of SEQUENCE.data.slice(BEGIN.data, END.data))
        {
            const DREF = program.heap[ELEMENT.data];
            
            ARRAY.push(new HeapData(Data.TYPEOF.null, null));
            
            allocate_from(
                program,
                ARRAY.at(-1),
                DREF
            );
        }
        
        allocate(
            program,
            SLICE,
            Data.TYPEOF.array,
            ARRAY
        );
    }
}

Operation.OPERATION[Operation.TYPEOF["field_access"]] =
function (program, operands)
{
    const RESULT = operands[0];
    const OBJECT = get(program, operands[1]).data;
    
    if (OBJECT.type !== Data.TYPEOF.object)
    {
        evoke_error_message(program, `can't access field not from class object`);
    }
    
    const NAME          = operands[2];
    const FIELD_NAME    = "CF$" + NAME;
    const CLASS         = OBJECT[0].data;
    
    if (CLASS.hasOwnProperty(FIELD_NAME) === false)
    {
        evoke_error_message(program, `object doesn't have field "${NAME}"`);
    }
    const INDEX     = CLASS[FIELD_NAME];
    const FIELD     = OBJECT[INDEX];
    
    deallocate(program, RESULT);
    program.heap[FIELD.data].reference_count += 1;
    
    RESULT.type = FIELD.type;
    RESULT.data = FIELD.data;
}
Operation.OPERATION[Operation.TYPEOF["method_access"]] =
function (program, operands)
{
    const OBJECT = get(program, operands[0]);
    
    if (OBJECT.type !== Data.TYPEOF.object)
    {
        evoke_error_message(program, `can't access method not from class object`);
    }
    
    const CLASS         = OBJECT.data[0].data;
    const NAME          = operands[1];
    const METHOD_NAME   = "CM$" + NAME;
    
    if (CLASS.hasOwnProperty(METHOD_NAME) === false)
    {
        evoke_error_message(program, `object doesn't have method "${NAME}"`);
    }
    
    const FUNCTION      = CLASS[METHOD_NAME].data;
    const FUNCTION_ID   = FUNCTION[1];
    const JUMP          = FUNCTION[0] - 1;
    
    const PARAMETERS = structuredClone(operands[2]);
    for (var object of PARAMETERS)
    {
        object = sget(program, object);
    }
    program.parameter_stack.push(PARAMETERS);
    
    program.function_offset[FUNCTION_ID].push(program.stack.length);
    program.jump_back.push([program.current_operation + 1, FUNCTION_ID]);
    for (var i = 0; i < program.function_memory[FUNCTION_ID]; i += 1)
    {
        program.stack.push(new Data(Data.TYPEOF.null, null));
    }
    
    program.current_operation = JUMP;
    
    program.object_stack.push(OBJECT);
}

Operation.OPERATION[Operation.TYPEOF["create_field"]] =
function (program, operands)
{
    const INDEX     = operands[0];
    const VALUE     = operands[1];
    const OBJECT    = program.object_stack.at(-1);
    
    const DREF      = sget(program, VALUE); 
    const MIDPOINT  = new Data(Data.TYPEOF.null, null);
    
    allocate(program, MIDPOINT, DREF.type, DREF.data);
    
    OBJECT.data[INDEX] = MIDPOINT;
    
    program.heap[DREF.data].reference_count += 1;
}

Operation.OPERATION[Operation.TYPEOF["this"]] =
function (program, operands)
{
    if (program.object_stack.length === 0)
    {
        evoke_error_message(program, "can't call this outside class method");
    }
    
    const RESULT = operands[0];
    const OBJECT = program.object_stack.at(-1);
    
    allocate_from(program, RESULT, OBJECT);
}
Operation.OPERATION[Operation.TYPEOF["new_object"]] =
function (program, operands)
{
    const CLASS         = get(program, operands[0]);
    const FUNCTION      = CLASS.data["$"].data;
    const FUNCTION_ID   = FUNCTION[1];
    const JUMP          = FUNCTION[0] - 1;
    
    const PARAMETERS = structuredClone(operands[1]);
    for (var object of PARAMETERS)
    {
        object = sget(program, object);
    }
    program.parameter_stack.push(PARAMETERS);
    
    program.function_offset[FUNCTION_ID].push(program.stack.length);
    program.jump_back.push([program.current_operation + 1, FUNCTION_ID]);
    for (var i = 0; i < program.function_memory[FUNCTION_ID]; i += 1)
    {
        program.stack.push(new Data(Data.TYPEOF.null, null));
    }
    
    program.current_operation = JUMP;
    
    program.object_stack.push(new Data(Data.TYPEOF.object, [CLASS]));
}
Operation.OPERATION[Operation.TYPEOF["get_object"]] =
function (program, operands)
{
    const POSITION = sget(program, operands[0]);
    
    allocate(
        program,
        POSITION,
        Data.TYPEOF.object,
        program.object_stack.pop().data
    );
}

Operation.OPERATION[Operation.TYPEOF["pop_object"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const RETURN_VALUE  = program.return_value;
    
    allocate_from(program, RESULT, RETURN_VALUE);
    
    deallocate(program, RETURN_VALUE);
    
    program.object_stack.pop();
}

Operation.OPERATION[Operation.TYPEOF["len"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const OBJECT    = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.string &&
        OBJECT.type !== Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        OBJECT.data.length
    );
}
Operation.OPERATION[Operation.TYPEOF["push"]] =
function (program, operands)
{
    const ARRAY    = get(program, operands[0]);
    const VALUE     = operands[1];

    if (ARRAY.type !== Data.TYPEOF.array)
    {
        evoke_error(program);
    }

    ARRAY.data.push(new HeapData(Data.TYPEOF.null, null));
    const ELEMENT = ARRAY.data.at(-1);
    
    allocate_from(
        program,
        ELEMENT,
        VALUE
    );
}
Operation.OPERATION[Operation.TYPEOF["pop"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const ARRAY     = get(program, operands[1]);
    
    if (ARRAY.type !== Data.TYPEOF.array)
    {
        evoke_error(program);
    }
    if (ARRAY.data.length === 0)
    {
        evoke_error_message(program, "can't pop from empty array");
    }
    
    deallocate(program, RESULT);
    
    const ELEMENT = program.heap[ARRAY.data.pop().data];
    
    RESULT.type = ELEMENT.type;
    RESULT.data = ELEMENT.data;
}
Operation.OPERATION[Operation.TYPEOF["split"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const STRING        = get(program, operands[1]);
    const DELIMETER     = get(program, operands[2]);
    
    if (STRING.type !== Data.TYPEOF.string ||
        DELIMETER.type !== Data.TYPEOF.string 
    )
    {
        evoke_error(program, 0);
    }
    
    const ARRAY         = STRING.data.split(DELIMETER.data);
    const RESULT_ARRAY  = [];
    for (const ELEMENT of ARRAY)
    {
        const ENDPOINT = new Data(Data.TYPEOF.null, null);
            
        allocate(program, ENDPOINT, Data.TYPEOF.string, ELEMENT);
        
        RESULT_ARRAY.push(ENDPOINT);
    }
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.array, 
        RESULT_ARRAY
    );
}
Operation.OPERATION[Operation.TYPEOF["join"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const ARRAY         = get(program, operands[1]);
    const DELIMETER     = get(program, operands[2]);
    
    if (ARRAY.type !== Data.TYPEOF.array ||
        DELIMETER.type !== Data.TYPEOF.string
    )
    {
        evoke_error(program, 0);
    }
    
    var array = [];
    for (const ELEMENT of ARRAY.data)
    {
        array.push(to_string(program, get(program, ELEMENT)));
    }
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.string, 
        array.join(DELIMETER.data)
    );
}
Operation.OPERATION[Operation.TYPEOF["code_of_char"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const OBJECT    = get(program, operands[1]);
    const INDEX     = get(program, operands[2]);

    if (OBJECT.type !== Data.TYPEOF.string ||
        INDEX.type !== Data.TYPEOF.number ||
        INDEX.data % 1 !== 0 ||
        INDEX.data < 0 ||
        INDEX.data > OBJECT.data.length
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        OBJECT.data.charCodeAt(INDEX.data)
    );
}

Operation.OPERATION[Operation.TYPEOF["print"]] =
function (program, operands)
{
    for (const ELEMENT of operands)
    {
        print(program, ELEMENT);
    }
}
Operation.OPERATION[Operation.TYPEOF["println"]] =
function (program, operands)
{
    for (const ELEMENT of operands)
    {
        print(program, ELEMENT);
    }
    
    print(program, new Data(Data.TYPEOF.string, "\n"));
}
Operation.OPERATION[Operation.TYPEOF["await"]] =
function (program, operands)
{
    const HINT_TEXT = get(program, operands[0]);
    
    program.is_end = true;
    
    if (HINT_TEXT.type === Data.TYPEOF.null ||
        HINT_TEXT.type === Data.TYPEOF.array
    )
    {
        await_input("");
    }
    else
    {
        await_input(String(HINT_TEXT.data));
    }
}
Operation.OPERATION[Operation.TYPEOF["input"]] =
function (program, operands)
{
    const INPUT = sget(program, operands[0]);
    
    allocate(program, INPUT, Data.TYPEOF.string, get_input());
}

Operation.OPERATION[Operation.TYPEOF["format"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.string,
        get_format(program, VALUE)
    );
}

Operation.OPERATION[Operation.TYPEOF["clone"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    clone(
        program,
        RESULT,
        VALUE
    );
}

Operation.OPERATION[Operation.TYPEOF["rand"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.number,
        Math.random()
    );
}


Operation.OPERATION[Operation.TYPEOF["is_null"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.null
    );
}
Operation.OPERATION[Operation.TYPEOF["is_bool"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.bool
    );
}
Operation.OPERATION[Operation.TYPEOF["is_number"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.number
    );
}
Operation.OPERATION[Operation.TYPEOF["is_string"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.string
    );
}
Operation.OPERATION[Operation.TYPEOF["is_array"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.array
    );
}

Operation.OPERATION[Operation.TYPEOF["to_bool"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const EXPRESSION    = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        to_bool(program, EXPRESSION)
    );
}
Operation.OPERATION[Operation.TYPEOF["to_number"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const EXPRESSION    = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        to_number(program, EXPRESSION)
    );
}
Operation.OPERATION[Operation.TYPEOF["to_string"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const EXPRESSION    = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.string, 
        to_string(program, EXPRESSION)
    );
}

Operation.OPERATION[Operation.TYPEOF["exit"]] =
function (program, operands)
{
    print(program, new Data(Data.TYPEOF.string, "\nExit value: "));
    print(program, program.return_value);
    print(program, new Data(Data.TYPEOF.string, "\nRuntime: " + 
    `${precision(program.overall_time + (performance.now() - program.time_start))}ms`))
}



function to_bool (program, object)
{
    if (object.type === Data.TYPEOF.null)
    {
        return false;
    }
    if (object.type === Data.TYPEOF.bool)
    {
        return object.data;
    }
    if (object.type === Data.TYPEOF.number)
    {
        return object.data != 0;
    }
    if (object.type === Data.TYPEOF.string)
    {
        return object.data != "";
    }
    if (object.type === Data.TYPEOF.array)
    {
        return object.data.length != 0;
    }
    
    evoke_error_message(program, `unknown type in "to_bool"`);
}
function to_number (program, object)
{
    if (object.type === Data.TYPEOF.null)
    {
        return 0;
    }
    if (object.type === Data.TYPEOF.bool)
    {
        return Number(object.data);
    }
    if (object.type === Data.TYPEOF.number)
    {
        return object.data;
    }
    if (object.type === Data.TYPEOF.string)
    {
        return Number(object.data);
    }
    if (object.type === Data.TYPEOF.array)
    {
        evoke_error_message(program, "can't cast array to number");
    }
    
    evoke_error_message(program, `unknown type in "to_number"`);
}
function to_string (program, object)
{
    if (object.type === Data.TYPEOF.null)
    {
        return "null";
    }
    if (object.type === Data.TYPEOF.bool)
    {
        return object.data ? "true" : "false";
    }
    if (object.type === Data.TYPEOF.number)
    {
        return String(object.data);
    }
    if (object.type === Data.TYPEOF.string)
    {
        return object.data;
    }
    if (object.type === Data.TYPEOF.array)
    {
        evoke_error_message(program, "can't cast array to string");
    }
    
    evoke_error_message(program, `unknown type in "to_string"`);
}

function clone (program, object, value) 
{
    if (program.free_memory.length === 0)
    {
        var position = program.heap.length;
        program.heap.push(null);
    }
    else
    {
        var position = program.free_memory.pop();
    }
    
    if (value.type === Data.TYPEOF.array)
    {
        const ARRAY = [];
        for (const ELEMENT of value.data)
        {
            const ENDPOINT  = new Data(Data.TYPEOF.null, null);
            const MIDPOINT  = new Data(Data.TYPEOF.null, null);
            
            clone(program, ENDPOINT, get(program, ELEMENT));
            allocate(program, MIDPOINT, ENDPOINT.type, ENDPOINT.data);
            
            ARRAY.push(MIDPOINT);
        }
        
        program.heap[position] = new HeapData(Data.TYPEOF.array, ARRAY);
    }
    else 
    {
        program.heap[position] = new HeapData(value.type, value.data);
    }
    
    deallocate(program, object);

    object.type = Data.TYPEOF.dref;
    object.data = position;
}

function allocate (program, object, type, data)
{
    if (program.free_memory.length === 0)
    {
        var position = program.heap.length;
        program.heap.push(new HeapData(null, null));
    }
    else
    {
        var position = program.free_memory.pop();
    }
    
    if (type === Data.TYPEOF.array)
    {
        const ARRAY = [];
        for (const ELEMENT of data)
        {
            const DREF      = sget(program, ELEMENT); 
            const MIDPOINT  = new Data(Data.TYPEOF.null, null);
            
            allocate(program, MIDPOINT, DREF.type, DREF.data);
            
            ARRAY.push(MIDPOINT);
            
            program.heap[DREF.data].reference_count += 1;
        }
        
        const OBJECT = program.heap[position];
        OBJECT.type = Data.TYPEOF.array;
        OBJECT.data = ARRAY;
        OBJECT.reference_count = 1;
    }
    else 
    {
        const OBJECT = program.heap[position];
        OBJECT.type = type;
        OBJECT.data = data;
        OBJECT.reference_count = 1;
    }
    
    deallocate(program, object);

    object.type = Data.TYPEOF.dref;
    object.data = position;
}
function allocate_from (program, object, value)
{
    const OBJECT    = pget(program, object)
    const VALUE     = get(program, value);
    
    if (VALUE.type === Data.TYPEOF.string ||
        VALUE.type === Data.TYPEOF.array 
        )
        {
        const POSITION  = pget(program, value);
        
        program.heap[POSITION.data].reference_count += 1;
        
        OBJECT.type = POSITION.type;
        OBJECT.data = POSITION.data;
    }
    else
    {
        allocate(program, OBJECT, VALUE.type, VALUE.data);
    }
}
function deallocate (program, object)
{
    // DEBUG
    // console.log("DEALLOCATE", object);
    // DEBUG
    
    if (object.type === Data.TYPEOF.dref)
    {
        const POSITION = object.data;
        program.heap[POSITION].reference_count -= 1;

        if (program.heap[POSITION].reference_count === 0)
        {
            const DEALOCATING = program.heap[POSITION];
            
            if (DEALOCATING.type === Data.TYPEOF.array)
            {
                for (const ELEMENT of DEALOCATING.data)
                {
                    deallocate(program, ELEMENT);
                }
            }
            
            program.heap[POSITION];
            program.free_memory.push(POSITION);
        }
    }
}

function get (program, object)
{
    // DEBUG

    // console.log("GET");
    // console.log(object);
    // console.log("----------");
    // for(const data of program.heap)
    // {
    //     console.log(data);
    // }

    // DEBUG

    if (object.type === Data.TYPEOF.sref)
    {
        const POSITION  = object.data;
        const OFFSET    = program.function_offset[POSITION[0]].at(-1);

        return get(program, program.stack[OFFSET + POSITION[1]]);
    }
    if (object.type === Data.TYPEOF.dref)
    {
        const POSITION = object.data;

        return get(program, program.heap[POSITION]);
    }

    return object;
}
function sget (program, object)
{
    // DEBUG

    // console.log("SGET");
    // console.log(object);
    // console.log("----------");
    // for(const data of program.heap)
    // {
    //     console.log(data);
    // }

    // DEBUG

    if (object.type === Data.TYPEOF.sref)
    {
        const POSITION  = object.data;
        const OFFSET    = program.function_offset[POSITION[0]].at(-1);

        return sget(program, program.stack[OFFSET + POSITION[1]]);
    }

    return object;
}
function pget (program, object)
{
    var next_object = null;
    
    if (object.type === Data.TYPEOF.sref)
    {
        const POSITION  = object.data;
        const OFFSET    = program.function_offset[POSITION[0]].at(-1);

        next_object = program.stack[OFFSET + POSITION[1]];
    }
    if (object.type === Data.TYPEOF.dref)
    {
        const POSITION = object.data;

        next_object = program.heap[POSITION];
    }
    
    if (next_object !== null && 
        (next_object.type === Data.TYPEOF.sref ||
        next_object.type === Data.TYPEOF.dref)
    )
    {
        return pget(program, next_object);
    }
    
    return object;
}

function print (program, object, stack = [])
{
    const VALUE = get(program, object);
    
    for (const PREVIOUS of stack)
    {
        if (PREVIOUS === VALUE)
        {
            if (VALUE.type === Data.TYPEOF.array)
            {
                addOutput(`[...(${VALUE.data.length})]`);
            }
            
            return;
        }
    }
    
    stack.push(VALUE);

    switch (VALUE.type)
    {
        case Data.TYPEOF.null:
        {
            addOutput("null");
        }
        break;

        case Data.TYPEOF.bool:
        case Data.TYPEOF.number:
        {
            addOutput(String(VALUE.data));   
        }
        break;
        case Data.TYPEOF.string:
        {
            addOutput(VALUE.data);   
        }
        break;

        case Data.TYPEOF.array:
        {
            addOutput("[");

            for (const INDEX in VALUE.data)
            {
                const ELEMENT = VALUE.data[INDEX];
    
                if (INDEX > 0)
                {
                    addOutput(", ");
                }
    
                print(program, ELEMENT, stack);
            }
    
            addOutput("]");
        }
        break;

        default:
            console.log(`unknown type: ${VALUE.type}, object ${VALUE}`);
    }
    
    stack.pop();
}
function get_format (program, value, depth = 0, nl = false)
{
    switch (value.type)
    {
        case Data.TYPEOF.null:
        {
            return "null";
        }
        break;
        case Data.TYPEOF.bool:
        {
            return value.data ? "true" : "false";
        }
        break;
        case Data.TYPEOF.number:
        {
            return String(value.data);
        }
        break;
        case Data.TYPEOF.string:
        {
            return `"${value.data}"`;
        }
        break;
        case Data.TYPEOF.array:
        {
            var text = "";
            if (nl)
            {
                text = "\n";
            }
            text += ". ".repeat(depth) + "[\n";
            
            for (const INDEX in value.data)
            {
                text += ". ".repeat(depth + 1) + INDEX + ": " + get_format(program, get(program, value.data[INDEX]), depth + 1, true) + "\n";
            }
            
            text += ". ".repeat(depth) + "]";
            
            return text;
        }
        break;
        case Data.TYPEOF.object:
        {
            var text = "";
            if (nl)
            {
                text = "\n";
            }
            text += ". ".repeat(depth) + "{\n";
            
            for (const NAME in value.data[0].data)
            {
                if (isNaN(value.data[0].data[NAME]) === false)
                {
                    text += ". ".repeat(depth + 1) + NAME.slice(3) + ": " + get_format(program, get(program, value.data[value.data[0].data[NAME]]), depth + 1, true) + "\n";
                }
            }
            
            text += ". ".repeat(depth) + "}";
            
            return text;
        }
        break;
    }
}

function evoke_error (program, except = -1)
{
    const OPERATION = program.operations[program.current_operation];
    const TYPE      = OPERATION.type;
    const OPERANDS  = OPERATION.operands;
    const POSITION  = OPERATION.position;

    var message = `can't execute "${Operation.OPERATIONS[TYPE]}" with [`;
    for (const INDEX in OPERANDS)
    {
        if (INDEX == except)
        {
            continue;
        }
        if (except != 0 && INDEX != 0 || except == 0 && INDEX != 1)
        {
            message += ", ";
        }

        message += Data.DATA_NAME.get(get(program, OPERANDS[INDEX]).type);
    }
    message += `]`;
    if (POSITION !== null)
    {
        message += ` at (${POSITION.row}, ${POSITION.column})`;
    }

    throw new Error(message);
}
function evoke_error_message (program, message)
{
    const OPERATION = program.operations[program.current_operation];
    const POSITION  = OPERATION.position;

    if (POSITION !== null)
    {
        message += ` at (${POSITION.row}, ${POSITION.column})`;
    }

    throw new Error(message);
}