const C = require("tree-sitter-c/grammar")

module.exports = grammar(C, {
    name: 'ispc',

    rules: {
        // TODO:
        // [X] fix tree-sitter-c dependency
        // [X] unmasked
        // [X] new/delete
        // [X] soa
        // [ ] operator overloads/in
        // [ ] template/typename/references
        // [X] tasks/launch/sync
        // [ ] ISPC constants identifiers
        // [ ] Standard library identifiers; assert/assume/print
        // [ ] programIndex/programCount/task*/thread* identifiers
        _top_level_item: (_, original) => original,

        storage_class_specifier: ($, original) => choice(
            'export',
            'noinline',
            field('ispc_special', $.task),
            field('ispc_special', $.unmasked),
            original,
        ),

        type_qualifier: ($, original) => choice(
            'varying',
            'uniform',
            $._soa_qualifier,
            original,
        ),

        _soa_qualifier: $ => seq(
            field('ispc_special', $.soa),
            '<',
            $.number_literal,
            '>'
        ),

        primitive_type: (_, original) => choice(
            'int8',
            'int16',
            'int32',
            'int64',
            'uint8',
            'uint16',
            'uint32',
            'uint64',
            'float16',
            original,
        ),

        ms_call_modifier: (_, original) => choice(
            '__vectorcall',
            '__regcall',
            original,
        ),

        _non_case_statement: ($, original) => choice(
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
            original,
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
