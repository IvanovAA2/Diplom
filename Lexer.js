class Position
{
    row;
    column;

    constructor (row, column) 
    {
        this.row    = row;
        this.column = column;
    }
}

class Token 
{
    type;
    string;
    position; 

    constructor (type, string, row, column) 
    {
        this.type       = type;
        this.string     = string;
        this.position   = new Position(row, column);
    }
}

const EOF = "EOF";

class Lexer
{
    #input;
    #position   = 0;
    #row        = 1;
    #column     = 1;

    static #is_letter_regex     = /[A-Za-z]/;
    static #is_digit_regex      = /[0-9]/;
    static #is_whitespace_regex = /[ \n\r\t\v]/;

    static keywords = new Set
    ([
        "var",
        "ref",
        
        "null",

        "true",
        "false",
        "number",
        "numberToken",
        "string",
        "stringToken",
        "array",

        "set",
        "get",

        "bool",
        "number",
        "string",

        "print",
        "input",
        
        "if",
        "elif",
        "else",

        "for",
        "while",

        "or",
        "and",
    ]);
    static tokens = new Set
    ([
        ":",
        ";",
        ".",
        ",",

        "id",
    
        "{",
        "}",
        "[",
        "]",
        "(",
        ")",
    
        "+",
        "-",
        "*",
        "/",
        "//",
        "%",

        "=",
        "+=",
        "-=",
        "*=",
        "/=",
        "//=",

        "==",
        "!=",

        "<",
        ">",
        "<=",
        ">=",
    ]);

    verify_token(token)
    {
        if (Lexer.tokens.has(token) === false && Lexer.keywords.has(token) === false) 
        {
            throw new Error(`invalid token name "${token}" at (${this.#row}, ${this.#column})`);
        }
        return token;
    }

    constructor (input) 
    {
        this.#input = input;
    }

    #is_letter_check(c) 
    {
        return Lexer.#is_letter_regex.test(c);
    }

    #is_letter()
    {
        if (this.#position >= this.#input.length) 
        {
            return false;
        }
        return this.#is_letter_check(this.#input[this.#position]);
    }

    #is_digit_check(c) 
    {
        return Lexer.#is_digit_regex.test(c);
    }

    #is_digit()
    {
        if (this.#position >= this.#input.length) 
        {
            return false;
        }
        return this.#is_digit_check(this.#input[this.#position]);
    }

    #is_equal(symbol)
    {
        if (this.#position >= this.#input.length) 
        {
            return false;
        }
        return this.#input[this.#position] === symbol;
    }

    #next_is_equal(c)
    {
        if (this.#position + 1 >= this.#input.length) 
        {
            return false;
        }
        return this.#input[this.#position + 1] === c;
    }

    #is_whitespace()
    {
        return Lexer.#is_whitespace_regex.test(this.#input[this.#position]);
    }
    
    get_tokens() 
    {
        this.#position = 0;

        var tokens = [];

        while (this.#position < this.#input.length) 
        {
            const begin_row     = this.#row;
            const begin_column  = this.#column;
            
            if(this.#is_whitespace()) 
            {
                if (this.#is_equal('\n')) 
                {
                    ++this.#row;
                    this.#column = 0;
                }
                ++this.#column;
                ++this.#position;
                continue;
            }

            if (this.#is_letter()) 
            {
                var word = this.#input[this.#position++];
                ++this.#column;

                while (this.#is_letter() || this.#is_equal('_') || this.#is_digit()) 
                {
                    word += this.#input[this.#position++];
                    ++this.#column;
                }

                if (Lexer.keywords.has(word)) 
                {
                    tokens.push(new Token(word, word, begin_row, begin_column));
                }
                else 
                {
                    tokens.push(new Token(this.verify_token("id"), word, begin_row, begin_column));
                }
                continue;
            }

            if (this.#is_digit()) 
            {
                var number = this.#input[this.#position++];
                ++this.#column;

                while (this.#is_digit()) 
                {
                    number += this.#input[this.#position++];
                    ++this.#column;
                }

                if (this.#is_equal('.')) 
                {
                    number += '.';
                    ++this.#position;
                    ++this.#column;

                    while (this.#is_digit()) 
                    {
                        number += this.#input[this.#position++];
                        ++this.#column;
                    }
                }
                tokens.push(new Token(this.verify_token("numberToken"), number, begin_row, begin_column));
                
                continue;
            }

            if (this.#is_equal('"') || this.#is_equal("'"))
            {
                const quote = this.#input[this.#position++];
                var string  = "";

                while (this.#is_equal(quote) === false)
                {
                    if (this.#is_equal('\\')) 
                    {
                        switch (this.#input[++this.#position])
                        {
                            case 'n':
                            {
                                ++this.#row;
                                this.#column = 0;
                                string += '\n';
                            }
                            break;
                        }
                    }
                    else
                    {
                        string += this.#input[this.#position];
                    }

                    ++this.#column;
                    if (++this.#position === this.#input.length)
                    {
                        throw new Error(`string started at (${begin_row}, ${begin_column}}) wasn't closed`);
                    }
                }

                ++this.#column;
                ++this.#position
                tokens.push(new Token(this.verify_token("stringToken"), string, begin_row, begin_column));
                
                continue;
            }

            switch (this.#input[this.#position]) 
            {
                case '{':
                    tokens.push(new Token(this.verify_token("{"), "{", begin_row, begin_column));
                break;

                case '}':
                    tokens.push(new Token(this.verify_token("}"), "}", begin_row, begin_column));
                break;

                case '[':
                    tokens.push(new Token(this.verify_token("["), "[", begin_row, begin_column));
                break;

                case ']':
                    tokens.push(new Token(this.verify_token("]"), "]", begin_row, begin_column));
                break;

                case '(':
                    tokens.push(new Token(this.verify_token("("), "(", begin_row, begin_column));
                break;

                case ')':
                    tokens.push(new Token(this.verify_token(")"), ")", begin_row, begin_column));
                break;

                case ':':
                    tokens.push(new Token(this.verify_token(":"), ":", begin_row, begin_column));
                break;

                case ';':
                    tokens.push(new Token(this.verify_token(";"), ";", begin_row, begin_column));
                break;

                case '.':
                    tokens.push(new Token(this.verify_token("."), ".", begin_row, begin_column));
                break;

                case ',':
                    tokens.push(new Token(this.verify_token(","), ",", begin_row, begin_column));
                break;

                case '+':
                    if (this.#next_is_equal('='))
                    {
                        tokens.push(new Token(this.verify_token("+="), "+=", begin_row, begin_column));
                        ++this.#position;
                        ++this.#column;
                    }
                    else
                    {
                        tokens.push(new Token(this.verify_token("+"), "+", begin_row, begin_column));
                    }
                break;

                case '-':
                    if (this.#next_is_equal('='))
                        {
                            tokens.push(new Token(this.verify_token("-="), "-=", begin_row, begin_column));
                            ++this.#position;
                            ++this.#column;
                        }
                        else
                        {
                            tokens.push(new Token(this.verify_token("-"), "-", begin_row, begin_column));
                        }
                break;

                case '*':
                    if (this.#next_is_equal('='))
                        {
                            tokens.push(new Token(this.verify_token("*="), "*=", begin_row, begin_column));
                            ++this.#position;
                            ++this.#column;
                        }
                        else
                        {
                            tokens.push(new Token(this.verify_token("*"), "*", begin_row, begin_column));
                        }
                break;

                case '/':
                    if (this.#next_is_equal('/')) 
                    {
                        ++this.#position;
                        ++this.#column;
                        if (this.#next_is_equal('='))
                        {
                            tokens.push(new Token(this.verify_token("//="), "//=", begin_row, begin_column));
                            ++this.#position;
                            ++this.#column;
                        }
                        else
                        {
                            tokens.push(new Token(this.verify_token("//"), "//", begin_row, begin_column));
                        }
                    }
                    else
                    {
                        if (this.#next_is_equal('='))
                        {
                            tokens.push(new Token(this.verify_token("/="), "/=", begin_row, begin_column));
                            ++this.#position;
                            ++this.#column;
                        }
                        else
                        {
                            tokens.push(new Token(this.verify_token("/"), "/", begin_row, begin_column));
                        }
                    }
                break;

                case '&':
                    tokens.push(new Token(this.verify_token("&"), "&", begin_row, begin_column));
                break;

                case '|':
                    tokens.push(new Token(this.verify_token("&"), "&", begin_row, begin_column));
                break;

                case '^':
                    tokens.push(new Token(this.verify_token("&"), "&", begin_row, begin_column));
                break;

                case '=':
                    if (this.#next_is_equal('=')) 
                    {
                        tokens.push(new Token(this.verify_token("=="), "==", begin_row, begin_column));
                        ++this.#position;
                        ++this.#column;
                    }
                    else 
                    {
                        tokens.push(new Token(this.verify_token("="), "=", begin_row, begin_column));
                    }
                break;

                case '!':
                    if (this.#next_is_equal('=')) 
                    {
                        tokens.push(new Token(this.verify_token("!="), "!=", begin_row, begin_column));
                        ++this.#position;
                        ++this.#column;
                    }
                    else 
                    {
                        throw new Error(`didn't found '!' after '=' at (${this.#row}, ${this.#column})`);
                    }
                break;

                case '<':
                    if (this.#next_is_equal('=')) 
                    {
                        tokens.push(new Token(this.verify_token("<="), "<=", begin_row, begin_column));
                        ++this.#position;
                        ++this.#column;
                    }
                    else 
                    {
                        tokens.push(new Token(this.verify_token("<"), "<", begin_row, begin_column));
                    }
                break;

                case '>':
                    if (this.#next_is_equal('=')) 
                    {
                        tokens.push(new Token(this.verify_token(">="), ">=", begin_row, begin_column));
                        ++this.#position;
                        ++this.#column;
                    }
                    else 
                    {
                        tokens.push(new Token(this.verify_token(">"), ">", begin_row, begin_column));
                    }
                break;

                default:
                    throw new Error(`unknown symbol "${this.#input[this.#position]}" at (${this.#row}, ${this.#column})`);
            }
            ++this.#position;
            ++this.#column;
        }

        tokens.push(new Token(EOF, "", this.#row, this.#column));
        return tokens;
    }
}