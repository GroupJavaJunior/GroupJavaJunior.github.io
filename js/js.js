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

$.fn.getCursorPosition = function() {
    return this.get && this.get(0).selectionStart || 0;
};

var setup_thousand = $('div#thousand');
var setup_decimal = $('div#decimal');

var thousand_separator = ',';
var decimal_separator = '.';

var valid_symbols = /[0-9,.]/g;
var not_valid_symbols = /[^0-9,.]/g;

$(document).ready(function(){
    var input = $('input#1');

    input.on('paste', function(e){
        var selected_text = get_selected_text();
        var prev_pos = input.getCursorPosition();
        var val = input.val();
        var replacement = val.slice(0, prev_pos) +
            val.slice(prev_pos + selected_text.length, val.length);

        var pasted_data = e.originalEvent.clipboardData.getData('text');
        var clear_data = pasted_data.replace(not_valid_symbols, '');
        var new_val = insertTo(replacement, clear_data, prev_pos);

        var parsed_string = currencyfield.parse_string(new_val, '');
        input.val(parsed_string);
        input.setCursorPosition(prev_pos + clear_data.length);
        return false;
    });

    function insertTo(str, char, pos) {
        return [str.slice(0, pos), char, str.slice(pos)].join('');
    }

    input.on('keypress', function(evt) {
        $('.key_text').text(evt.key);

        var is_selected_text = get_selected_text().length > 1;
        var is_valid_symbol = evt.key.replace(valid_symbols, '') === '';
        if (is_selected_text && is_valid_symbol) {
            return true;
        }

        if (evt.key === thousand_separator) { return false; }

        var val = input.val();

        if (evt.key === decimal_separator && val.split(decimal_separator).length > 1) {
            return false;
        }

        var prev_pos = input.getCursorPosition();
        if (evt.key === '-' || evt.key === '+') {
            if(val.indexOf('-') >= 0) {
                input.val(val.replace(/-/g, ''));
                input.setCursorPosition(prev_pos - 1);
            } else if (evt.key === '-') {
                input.val('-' + val);
                input.setCursorPosition(prev_pos + 1);
            }

            return false;
        }

        if (!is_valid_symbol) { return false; }

        var new_val = insertTo(val, evt.key, prev_pos);

        var parsed_string = currencyfield.parse_string(new_val, '');
        input.val(parsed_string);
        input.setCursorPosition(prev_pos + 1);
        return false;
    });

    input.on('focus', function() {
        var val = input.val();
        var parse = currencyfield.parse_string(val, '');
        val && input.val(parse);
    });

    input.on('blur', function() {
        var val = input.val();
        var format_number = currencyfield.format_number(val, false);
        val && input.val(format_number);
    });

    var input2 = $('input#2');

    input2.on('blur', function() {
        var val = input2.val();
        var last_index_thousand = val.lastIndexOf(thousand_separator);

        if (last_index_thousand < 0) {
            val && input2.val(currencyfield.format_number(val));
            return false;
        } else {
            if (val.slice(last_index_thousand + 1, last_index_thousand + 4).length > 2) {
                input2.val(currencyfield.format_number(val));
            } else {
                input2.val('');
            }
        }
    });

    input2.on('keypress', function(evt) {
        $('.key_text').text(evt.key);
        var val = input2.val();

        var prev_pos = input2.getCursorPosition();
        if (evt.key === '-' || evt.key === '+') {
            if(val.replace(/[^-]/g, '').length > 0) {
                input2.val(val.replace(/-/g, ''));
                input2.setCursorPosition(prev_pos - 1);
            } else if (evt.key === '-') {
                input2.val('-' + val);
                input2.setCursorPosition(prev_pos + 1);
            }

            return false;
        }

        if (evt.key === decimal_separator && val.split(decimal_separator).length > 1) {
            return false;
        }

        if (evt.key.replace(valid_symbols, '') !== '') { 
            return false;
        }

        if (evt.key === '-' || evt.key === '+') {
            if(val.replace(/[^-]/g, '').length > 0) {
                
                input2.val(val.replace(/-/g, ''));
                input2.setCursorPosition(prev_pos - 1);
            } else if (evt.key === '-') {
                input2.val('-' + val);
                input2.setCursorPosition(prev_pos + 1);
            }

            return false;
        }
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
    }
};