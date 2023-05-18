const C = require("tree-sitter-c/grammar")

const PREC = Object.assign(C.PREC, {
  NEW: C.PREC.CALL + 1,
})

module.exports = grammar(C, {
    name: 'ispc',

    rules: {
        // TODO:
        // [X] fix tree-sitter-c dependency
        // [X] unmasked
        // [X] new/delete
        // [X] soa
        // [X] operator overloads/in
        // [ ] template/typename/references/default function args
        // [ ] LLVM intrinsic functions
        // [X] tasks/launch/sync
        //
        // [ ] ISPC constants identifiers
        // [ ] Standard library identifiers; assert/assume/print/ISPC{Alloc,Sync,Launch}
        // [ ] programIndex/programCount/task*/thread* identifiers
        _top_level_item: (_, original) => original,

        storage_class_specifier: ($, original) => choice(
            original,
            'export',
            'noinline',
        ),

        type_qualifier: ($, original) => prec(1, choice(
            original,
            $.ispc_qualifier,
        )),

        ispc_qualifier: $ => choice(
            'varying',
            'uniform',
            'task',
            'unmasked',
            $._soa_qualifier,
        ),

        _soa_qualifier: $ => seq(
            'soa',
            '<',
            $.number_literal,
            '>'
        ),

        _type_specifier: ($, original) => choice(
            original,
            $.short_vector,
        ),

        sized_type_specifier: $ => seq(
            repeat1(choice(
                'signed',
                'unsigned',
                'long',
                'short'
            )),
            optional(choice('varying', 'uniform')),
            field('type', optional(choice(
                prec.dynamic(-1, $._type_identifier),
                $.primitive_type,
                $.short_vector,
            )))
        ),

        short_vector: $ => prec(1, seq(
            $.primitive_type,
            '<',
            $.number_literal,
            '>'
        )),

        enum_specifier: $ => prec.right(seq(
            'enum',
            choice(
                seq(
                    field('name', $._type_identifier),
                    field('body', optional($.enumerator_list))
                ),
                field('body', $.enumerator_list)
            )
        )),

        struct_specifier: $ => prec.right(seq(
            'struct',
            optional($.ms_declspec_modifier),
            choice(
                seq(
                    field('name', $._type_identifier),
                    field('body', optional($.field_declaration_list))
                ),
                field('body', $.field_declaration_list)
            )
        )),

        union_specifier: $ => prec.right(seq(
            'union',
            optional($.ms_declspec_modifier),
            choice(
                seq(
                    field('name', $._type_identifier),
                    field('body', optional($.field_declaration_list))
                ),
                field('body', $.field_declaration_list)
            )
        )),

        primitive_type: (_, original) => choice(
            original,
            'int8',
            'int16',
            'int32',
            'int64',
            'uint8',
            'uint16',
            'uint32',
            'uint64',
            'float16',
        ),

        ms_call_modifier: (_, original) => choice(
            original,
            '__vectorcall',
            '__regcall',
        ),

        ms_declspec_modifier: $ => seq(
            '__declspec',
            '(',
            $.identifier, repeat(seq(',', $.identifier)),
            ')',
        ),

        parameter_declaration: $ => seq(
            $._declaration_specifiers,
            optional(field('declarator', choice(
                $._declarator,
                $._abstract_declarator,
                $.init_declarator
            )))
        ),

        number_literal: $ => {
            const separator = "'";
            const hex = /[0-9a-fA-F]/;
            const decimal = /[0-9]/;
            const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
            const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));
            return token(seq(
                optional(/[-\+]/),
                optional(choice('0x', '0b')),
                choice(
                    seq(
                        choice(
                            decimalDigits,
                            seq('0b', decimalDigits),
                            seq('0x', hexDigits)
                        ),
                        optional(seq('.', optional(hexDigits)))
                    ),
                    seq('.', decimalDigits)
                ),
                optional(seq(
                    /[eEdDpP]/,
                    optional(seq(
                        optional(/[-\+]/),
                        hexDigits
                    ))
                )),
                repeat(choice(
                    'u', 'l', 'U', 'L', 'k', 'M', 'G',
                    'f16', 'f', 'd', 'F16', 'F', 'D'))
            ))
        },

        _non_case_statement: ($, original) => choice(
            original,
            $.cif_statement,
            $.cwhile_statement,
            $.cdo_statement,
            $.cfor_statement,
            $.foreach_statement,
            $.foreach_instance_statement,
            $.unmasked_statement,
        ),

        cif_statement: $ => prec.right(seq(
            'cif',
            field('condition', $.parenthesized_expression),
            field('consequence', $._statement),
            optional(seq(
                'else',
                field('alternative', $._statement)
            ))
        )),

        cwhile_statement: $ => seq(
            'cwhile',
            field('condition', $.parenthesized_expression),
            field('body', $._statement)
        ),

        cdo_statement: $ => seq(
            'cdo',
            field('body', $._statement),
            'while',
            field('condition', $.parenthesized_expression),
            ';'
        ),

        cfor_statement: $ => seq(
            'cfor',
            '(',
            choice(
                field('initializer', $.declaration),
                seq(field('initializer', optional(choice($._expression, $.comma_expression))), ';')
            ),
            field('condition', optional(choice($._expression, $.comma_expression))), ';',
            field('update', optional(choice($._expression, $.comma_expression))),
            ')',
            field('body', $._statement)
        ),

        foreach_statement: $ => seq(
            choice('foreach', 'foreach_tiled'),
            '(',
            $._foreach_range, repeat(seq(',', $._foreach_range)),
            ')',
            field('body', $._statement)
        ),

        foreach_instance_statement: $ => seq(
            choice('foreach_active', 'foreach_unique'),
            '(',
            field('initializer', $._expression),
            optional(
                seq(
                    $.in_operator,
                    field('condition', $._expression),
                )
            ),
            ')',
            field('body', $._statement)
        ),

        _foreach_range: $ => seq(
            field('range_start', $._expression),
            $.range_operator,
            field('range_end', $._expression),
        ),

        unmasked_statement: $ => seq(
            'unmasked',
            field('body', $.compound_statement),
        ),

        _expression: ($, original) => choice(
            original,
            $.new_expression,
            $.delete_expression,
            $.launch_expression,
            $.sync_expression,
        ),

        new_expression: $ => prec.right(PREC.NEW, seq(
            optional(repeat($.ispc_qualifier)),
            'new',
            field('placement', optional($.argument_list)),
            optional(repeat($.ispc_qualifier)),
            field('type', $._type_specifier),
            field('declarator', optional($.new_declarator)),
            field('arguments', optional(choice(
                $.argument_list,
                $.initializer_list
            )))
        )),

        new_declarator: $ => prec.right(seq(
            '[',
            field('length', $._expression),
            ']',
            optional($.new_declarator)
        )),

        delete_expression: $ => seq(
            'delete',
            optional(seq('[', ']')),
            $._expression
        ),

        launch_expression: $ => prec.left(1, seq(
            'launch',
            field('launch_config', optional(choice(
                repeat1(seq('[', $._expression, ']')),
                seq('[', $._expression, repeat(seq(',', $._expression)), ']'),
            ))),
            $._expression,
        )),

        sync_expression: $ => 'sync',

        _declarator: ($, original) => choice(
            original,
            $.overload_declarator,
            $.reference_declarator,
        ),

        overload_declarator: $ => prec(1, seq(
            'operator',
            field('operator', choice(
                '*',
                '/',
                '%',
                '+',
                '-',
                '>>',
                '<<',
            )),
            field('parameters', $.parameter_list),
            repeat($.attribute_specifier),
          )),

        reference_declarator: $ => prec.dynamic(1, prec.right(seq(
          '&',
          optional(field('declarator', $._declarator))
        ))),

        // operators
        range_operator: $ => '...',
        in_operator: $ => 'in',
        // overload_operator: $ => 'operator',
        // new_operator: $ => 'new',
        // delete_operator: $ => 'delete',
    }
});
