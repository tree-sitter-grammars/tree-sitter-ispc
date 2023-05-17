const C = require("tree-sitter-c/grammar")

module.exports = grammar(C, {
    name: 'ispc',

    rules: {
        // TODO:
        // [ ] fix tree-sitter-c dependency
        // [ ] unmasked
        // [ ] new/delete
        // [ ] assert/assume/soa/print
        // [ ] operator overloads/in
        // [ ] template/typename
        // [ ] tasks/launch/sync
        // [ ] ISPC constants identifiers
        // [ ] Standard library identifiers
        // [ ] programIndex/programCount/task*/thread* identifiers
        _top_level_item: (_, original) => original,

        storage_class_specifier: ($, original) => choice(
            'export',
            'noinline',
            field('task', $._task),
            original,
        ),

        _task: $ => token(
            'task'
        ),

        type_qualifier: (_, original) => choice(
            'varying',
            'uniform',
            original,
        ),

        primitive_type: (_, original) => token(choice(
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
        )),

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
            $.foreach_lane_statement,
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

        foreach_lane_statement: $ => seq(
            choice('foreach_active', 'foreach_unique'),
            '(',
            $._expression,
            optional(
                seq(
                    field('in_operator', $.in_operator),
                    $._expression,
                )
            ),
            ')',
            field('body', $._statement)
        ),

        _foreach_range: $ => seq(
            field('range_start', $._expression),
            field('range_operator', $.range_operator),
            field('range_end', $._expression),
        ),

        range_operator: $ => token(
            '...'
        ),

        in_operator: $ => token(
            'in'
        ),
    }
});
