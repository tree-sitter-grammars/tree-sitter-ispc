const C = require("tree-sitter-c/grammar")

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

        type_qualifier: ($, original) => choice(
            original,
            'varying',
            'uniform',
            field('ispc_special', $.task),
            field('ispc_special', $.unmasked),
            $._soa_qualifier,
        ),

        _soa_qualifier: $ => seq(
            field('ispc_special', $.soa),
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

        short_vector: $ => seq(
            $.primitive_type,
            '<',
            $.number_literal,
            '>'
        ),

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
            $.launch_statement,
            $.sync_statement,
            $.new_statement,
            $.delete_statement,
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
            field('ispc_special', $.unmasked),
            field('body', $.compound_statement),
        ),

        launch_statement: $ => prec(1, seq(
            field('ispc_special', $.launch),
            field('launch_config', optional(choice(
                repeat1(seq('[', $._expression, ']')),
                seq('[', $._expression, repeat(seq(',', $._expression)), ']'),
            ))),
            $.call_expression,
            ';'
        )),

        sync_statement: $ => seq(
            field('ispc_special', $.sync),
            ';',
        ),

        new_statement: $ => seq(
            $._declaration_specifiers,
            field('declarator', $._declarator),
            '=',
            optional($.type_qualifier),
            field('ispc_special', $.new_operator),
            optional($.type_qualifier),
            field('type', $._type_specifier),
            optional(choice(
                seq('[',
                    repeat($.type_qualifier),
                    field('size', optional(choice($._expression, '*'))),
                    ']'),
                field('initializer', $.parenthesized_expression),
            )),
            ';'
        ),

        delete_statement: $ => seq(
            field('ispc_special', $.delete_operator),
            optional(seq('[', ']')),
            $._expression,
            ';',
        ),

        _declarator: ($, original) => choice(
            original,
            $.operator_declarator,
            $.reference_declarator,
        ),

        operator_declarator: $ => prec(1, seq(
            field('declarator', $.overload_operator),
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

        // special keywords
        task: $ => 'task',
        unmasked: $ => 'unmasked',
        launch: $ => 'launch',
        sync: $ => 'sync',
        soa: $ => 'soa',

        // operators
        range_operator: $ => '...',
        in_operator: $ => 'in',
        overload_operator: $ => 'operator',
        new_operator: $ => 'new',
        delete_operator: $ => 'delete',
    }
});
