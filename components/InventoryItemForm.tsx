import React from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

interface InventoryItemFormProps {
  name: string;
  purchasingPrice: string;
  salesPrice: string;
  quantity: string;
  errors: { name?: string; purchasingPrice?: string; salesPrice?: string; quantity?: string };
  onNameChange: (val: string) => void;
  onPurchasingPriceChange: (val: string) => void;
  onSalesPriceChange: (val: string) => void;
  onQuantityChange: (val: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  editing?: boolean;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
  name,
  purchasingPrice,
  salesPrice,
  quantity,
  errors,
  onNameChange,
  onPurchasingPriceChange,
  onSalesPriceChange,
  onQuantityChange,
  onSubmit,
  onCancel,
  editing,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Item Name</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={name}
        onChangeText={onNameChange}
        placeholder="Enter item name"
      />
      {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}


      <Text style={styles.label}>Purchasing Price</Text>
      <TextInput
        style={[styles.input, errors.purchasingPrice && styles.inputError]}
        value={purchasingPrice ? Number(purchasingPrice.replace(/,/g, '')).toLocaleString() : ''}
        onChangeText={val => {
          // Remove commas before updating parent state
          const raw = val.replace(/,/g, '');
          onPurchasingPriceChange(raw);
        }}
        placeholder="Enter purchasing price"
        keyboardType="decimal-pad"
      />
      {errors.purchasingPrice ? <Text style={styles.errorText}>{errors.purchasingPrice}</Text> : null}

      <Text style={styles.label}>Sales Price</Text>
      <TextInput
        style={[styles.input, errors.salesPrice && styles.inputError]}
        value={salesPrice ? Number(salesPrice.replace(/,/g, '')).toLocaleString() : ''}
        onChangeText={val => {
          const raw = val.replace(/,/g, '');
          onSalesPriceChange(raw);
        }}
        placeholder="Enter sales price"
        keyboardType="decimal-pad"
      />
      {errors.salesPrice ? <Text style={styles.errorText}>{errors.salesPrice}</Text> : null}

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={[styles.input, errors.quantity && styles.inputError]}
        value={quantity ? Number(quantity.replace(/,/g, '')).toLocaleString() : ''}
        onChangeText={val => {
          const raw = val.replace(/,/g, '');
          onQuantityChange(raw);
        }}
        placeholder="Enter quantity"
        keyboardType="numeric"
      />
      {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}

      <View style={styles.buttonRow}>
        <Button
          title={editing ? 'Update' : 'Add'}
          onPress={onSubmit}
        />
        {editing && onCancel ? (
          <View style={{ marginLeft: 8 }}>
            <Button title="Cancel" color="#888" onPress={onCancel} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});

export default InventoryItemForm;
