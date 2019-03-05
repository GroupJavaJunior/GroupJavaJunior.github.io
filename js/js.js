/*global $, document, window*/

$.fn.setCursorPosition = function(pos) {
    this.each(function(index, elem) {
        if (elem.setSelectionRange) {
            elem.setSelectionRange(pos, pos);
        } else if (elem.createTextRange) {
            var range = elem.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    });
    return this;
};

$.fn.getCursorPosition = function() {
    return this.get && this.get(0).selectionStart || 0;
};

var get_selected_text = function() {
    var text = '';
    var activeEl = document.activeElement;
    var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
    if ((activeElTagName === 'textarea') || (activeElTagName === 'input' &&
        /^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
        (typeof activeEl.selectionStart === 'number')) {
        text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
    } else if (window.getSelection) {
        text = window.getSelection().toString();
    }
    return text;
};

function insertTo(str, char, pos) {
    return [str.slice(0, pos), char, str.slice(pos)].join('');
}

var thousand_separator = ',';
var decimal_separator = '.';

var regex_invalid_symbols  = /[^0-9,.-]/g;

$(document).ready(function(){
    var setup_thousand = $('div#thousand');
    var setup_decimal = $('div#decimal');
    var input = $('input#1');

    function handle_variant(val) {
        var result = currencyfield.check_valid(val);

        if (result.variants && result.variants.length > 0) {
            input.autocomplete({
                minLength: 0,
                source: function(request, response) {
                    response(result.variants);
                },
                select: function() {
                    input.autocomplete('destroy');
                }
            });
            input.autocomplete('search','');
        } else {
            if (input.data('ui-autocomplete')) {
                input.autocomplete('destroy');
            }
        }

        return result;
    }

    input.on('keyup', function(evt) {
        if (evt.keyCode === 38 || evt.keyCode === 40 || evt.keyCode === 13) { return true; }
        handle_variant(input.val());
    });

    input.on('blur', function() {
        var val = input.val();
        var result = currencyfield.check_valid(val);

        if (input.data('ui-autocomplete')) { input.autocomplete('destroy'); }

        if (result.valid) {
            input.val(currencyfield.format_number(result.val));
        } else {
            input.val('');
        }
    });

    input.on('paste', function(e){
        var selected_text = get_selected_text();
        var prev_pos = input.getCursorPosition();
        var val = input.val();
        var replacement = val.slice(0, prev_pos) +
            val.slice(prev_pos + selected_text.length, val.length);

        var pasted_data = e.originalEvent.clipboardData.getData('text');
        var clear_data = pasted_data.replace(regex_invalid_symbols, '');
        var new_val = insertTo(replacement, clear_data, prev_pos);

        input.val(handle_variant(new_val).val);
        input.setCursorPosition(prev_pos + clear_data.length);
        return false;
    });

    input.on('keypress', function(evt) {
        $('.key_text').text(evt.key);
        var val = input.val();

        var prev_pos = input.getCursorPosition();
        if (evt.key === '-' || evt.key === '+') {
            if(val.replace(/[^-]/g, '').length > 0) {
                input.val(val.replace(/-/g, ''));
                input.setCursorPosition(prev_pos - 1);
            } else if (evt.key === '-') {
                input.val('-' + val);
                input.setCursorPosition(prev_pos + 1);
            }

            return false;
        }

        var more_than_two_decimal = evt.key === decimal_separator && val.split(decimal_separator).length > 1;
        var has_invalid_symbols = evt.key.replace(regex_invalid_symbols, '') === '';

        if (more_than_two_decimal || has_invalid_symbols) { return false; }
    });

    var swap = $('input#swap');

    swap.on('click', function() {
        var swap = setup_decimal.text();
        setup_decimal.text(setup_thousand.text());
        setup_thousand.text(swap);

        decimal_separator = setup_decimal.text();
        thousand_separator = setup_thousand.text();
    });
});


var currencyfield = {
    default_rounding_degree: 10,
    amount_rounding_degree: 2,
    format_number: function(number, fixed) {
        number = currencyfield.normalize_string(number, '');
        // Taken from https://gist.github.com/820619
        var num = parseFloat(number.toString().replace(/\$|,/g, ''));
        if (isNaN(num)) {
            num = 0;
        }
        var sign = (num === (num = Math.abs(num)));
        var cents;
        var default_rounding_degree = Math.pow(10, fixed ? currencyfield.amount_rounding_degree : currencyfield.default_rounding_degree);
        num = Math.floor(num * default_rounding_degree + 0.50000000001);
        cents = (num / default_rounding_degree).toString().split('.')[1] || '00';
        cents = currencyfield.prepare_cents(cents);
        num = Math.floor(num / default_rounding_degree).toString();
        for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++) {
            num = num.substring(0, num.length - (4 * i + 3)) + thousand_separator + num.substring(num.length - (4 * i + 3));
        }
        return ((sign ? '' : '-') + num + decimal_separator + cents);
    },

    prepare_cents: function(cents) {
        var all_zeros_after_two_digits = /(..)0*$/g;
        return cents.replace(all_zeros_after_two_digits, '$1');
    },

    parse_string: function(str, fixed) {
        var norm_str = currencyfield.normalize_string(str);

        if (fixed === '') {
            var splitted = norm_str.split('.');
            if (!splitted[1]) { return str; }

            return splitted[0] +
                   decimal_separator +
                   currencyfield.prepare_cents(splitted[1]);
        }

        return parseFloat(norm_str).toFixed(
            fixed ? currencyfield.amount_rounding_degree : currencyfield.default_rounding_degree
        );
    },

    normalize_string: function(str) {
        var num_str = str.toString();
        var thousand_pattern = new RegExp('\\' + thousand_separator, 'g');
        var decimal_pattern = new RegExp('\\' + decimal_separator, 'g');
        return num_str.replace(thousand_pattern, '').replace(decimal_pattern, '.');
    },

    replaceAt: function(string, index, replace) {
        return string.substring(0, index) + replace + string.substring(index + 1);
    },

    minus_handler: function(val) {
        var minus_regexp = /[-]/g;
        var match_minus = val.match(minus_regexp);
        if (match_minus) {
            val = val.replace(minus_regexp, '');
            if (match_minus.length % 2 !== 0) {
                val = '-' + val;
            }
        }

        return val;
    },

    check_valid: function(val) {
        var valid = false;

        // Стоит удалить все кроме валидных символов
        val = val.replace(regex_invalid_symbols, '');

        // Теперь определим знак числа + или -, определить количество чет или нечет
        // var minus_regexp = /[-]/g;
        // var match_minus = val.match(minus_regexp);
        // if (match_minus) {
        //     val = val.replace(minus_regexp, '');
        //     if (match_minus.length % 2 !== 0) {
        //         val = '-' + val;
        //     }
        // }

        val = currencyfield.minus_handler(val);

        // Замена разделителей на тысячные
        val = val.replace(/[,.]/g, thousand_separator);
        var last_pos = val.lastIndexOf(thousand_separator);

        // Если у нас нет разделителей, число считать валидным
        if (last_pos < 0) {
            return { valid: true, val: val };
        }

        // Если после последнего разделителя 0,1,2 числа, то этот разделитель десятичный
        // Мы должны его поменять для пользователя на тот, что в настройках
        var match_double_end = val.match(/[,.][0-9]{0,2}$/g);
        if (match_double_end && match_double_end[0]) {
            valid = true;
            val = currencyfield.replaceAt(val, last_pos, decimal_separator);
        }

        // Если у нас 3 и более знаков после последнего разделителя, мы не можем быть уверены,
        // что имеет в виду пользователь
        var variants = [];
        var match_three = val.match(/[,.][0-9]{3,}$/g);
        if (match_three && match_three[0]) {
            valid = true;
            variants.push(
                currencyfield.format_number(currencyfield.replaceAt(val, last_pos, decimal_separator))
            );
            variants.push(
                currencyfield.format_number(currencyfield.replaceAt(val, last_pos, thousand_separator))
            );
            var normalize_string = currencyfield.replaceAt(val, last_pos, '.');
            var less_than_one = normalize_string > -1 && normalize_string < 1;
            if (less_than_one) { variants = []; }
            val = currencyfield.replaceAt(val, last_pos, decimal_separator);
        }

        return { valid: valid, val: val, variants: variants };
    }
};

var test = {
    tested_data: function() {
        return [
            { input: ',000', valid: '0' + decimal_separator + '00' },
            { input: '.000', valid: '0' + decimal_separator + '00' },
            { input: ',0000', valid: '0' + decimal_separator + '00' },
            { input: '.0000', valid: '0' + decimal_separator + '00' },
            { input: ',0001', valid: '0' + decimal_separator + '0001' },
            { input: '.0001', valid: '0' + decimal_separator + '0001' },
            { input: '1,0001', valid: '1' + decimal_separator + '0001' },
            { input: '1.0001', valid: '1' + decimal_separator + '0001' },
            { input: '1,0000', valid: '1' + decimal_separator + '00' },
            { input: '1.0000', valid: '1' + decimal_separator + '00' },
            { input: '0', valid: '0' + decimal_separator + '00' },
            { input: '00', valid: '0' + decimal_separator + '00' },
            { input: '0,', valid: '0' + decimal_separator + '00' },
            { input: '0.', valid: '0' + decimal_separator + '00' },
            { input: ',', valid: '0' + decimal_separator + '00' },
            { input: '.', valid: '0' + decimal_separator + '00' },
            { input: '.0', valid: '0' + decimal_separator + '00' },
            { input: '.00', valid: '0' + decimal_separator + '00' },
            { input: ',0', valid: '0' + decimal_separator + '00' },
            { input: ',00', valid: '0' + decimal_separator + '00' },
            

            { input: '01', valid: '1' + decimal_separator + '00' },
            { input: '10', valid: '10' + decimal_separator + '00' },
            { input: '100', valid: '100' + decimal_separator + '00' },
            { input: '100,0', valid: '100' + decimal_separator + '00' },
            { input: '100,01', valid: '100' + decimal_separator + '01' },
            { input: '100,001', valid: '100' + decimal_separator + '001' },
            
            { input: '1.000', valid: '1' + decimal_separator + '00' },
            { input: '1000', valid: '1' + thousand_separator + '000' + decimal_separator + '00' },

            { input: '1', valid: '1' + decimal_separator + '00' },
            { input: '1,', valid: '1' + decimal_separator + '00' },
            { input: '1.', valid: '1' + decimal_separator + '00' },
            { input: '1,0', valid: '1' + decimal_separator + '00' },
            { input: '1.0', valid: '1' + decimal_separator + '00' },
            { input: '1,00', valid: '1' + decimal_separator + '00' },
            { input: '1.00', valid: '1' + decimal_separator + '00' },
            { input: '1000', valid: '1' + thousand_separator + '000' + decimal_separator + '00' },
            { input: '1,000', valid: '1' + decimal_separator + '00' },
            { input: '1.000', valid: '1' + decimal_separator + '00' },
            { input: '11', valid: '11' + decimal_separator + '00' },
            { input: '11,', valid: '11' + decimal_separator + '00' },
            { input: '11.', valid: '11' + decimal_separator + '00' },
            { input: '11,0', valid: '11' + decimal_separator + '00' },
            { input: '11.0', valid: '11' + decimal_separator + '00' },
            { input: '11,00', valid: '11' + decimal_separator + '00' },
            { input: '11.00', valid: '11' + decimal_separator + '00' },
            { input: '11,000', valid: '11' + decimal_separator + '00' },
            { input: '11.000', valid: '11' + decimal_separator + '00' },
            { input: '123', valid: '123' + decimal_separator + '00' },
            { input: '123,', valid: '123' + decimal_separator + '00' },
            { input: '123.', valid: '123' + decimal_separator + '00' },
            { input: '123,0', valid: '123' + decimal_separator + '00' },
            { input: '123.0', valid: '123' + decimal_separator + '00' },
            { input: '123,00', valid: '123' + decimal_separator + '00' },
            { input: '123.00', valid: '123' + decimal_separator + '00' },
            { input: '123,000', valid: '123' + decimal_separator + '00' },
            { input: '123.000', valid: '123' + decimal_separator + '00' },
            { input: '1,123', valid: '1' + decimal_separator + '123' },
            { input: '1,123,', valid: '1' + thousand_separator + '123' + decimal_separator + '00' },
            { input: '1,123.', valid: '1' + thousand_separator + '123' + decimal_separator + '00' },

            { input: '123', valid: '123' + decimal_separator + '00' },
            { input: '123,', valid: '123' + decimal_separator + '00' },
            { input: '123.', valid: '123' + decimal_separator + '00' },
            { input: '1234', valid: '1' + thousand_separator + '234' + decimal_separator + '00' },
            { input: '1234,', valid: '1' + thousand_separator + '234' + decimal_separator + '00' },
            { input: '1234.', valid: '1' + thousand_separator + '234' + decimal_separator + '00' },
            { input: '1234.1', valid: '1' + thousand_separator + '234' + decimal_separator + '1' },
            { input: '1234,01', valid: '1' + thousand_separator + '234' + decimal_separator + '01' },
            { input: '1234,123', valid: '1' + thousand_separator + '234' + decimal_separator + '123' }
        ];
    },

    add: function(input, valid) {
        test.tested_data.push({ input: input, valid: valid });
    },

    test: function() {
        $.each(test.tested_data(), function(b, tested_item) {
            var actual = currencyfield.check_valid(tested_item.input);
            var actual_val = currencyfield.format_number(actual.val);
            var expected = tested_item.valid;

            if (!actual.valid && expected !== '') {
                console.log('not valid for: ' + tested_item.input);
                console.log('actual: ' + actual_val + '|' + ' expected: ' + expected);
                console.log('===================================');
            }

            if (actual.valid && actual_val !== expected) {
                console.log('diferencies for: ' + tested_item.input);
                console.log('actual: ' + actual_val + '|' + ' expected: ' + expected);
                console.log('===================================');
            }
        });
    }
};
