import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto'; 
import { UpdateCategoryDto } from './dto/update-category.dto'; 

// ✅ TẠO INTERFACE Category VÀ EXPORT ĐỂ CONTROLLER CÓ THỂ IMPORT TYPE
export interface Category {
    id: number;
    name: string;
    slug: string;
}

// Giả lập cơ sở dữ liệu categories (in-memory mock data)
const MOCK_CATEGORIES: Category[] = [
    { id: 1, name: 'Áo đấu', slug: 'ao-dau' },
    { id: 2, name: 'Giày bóng đá', slug: 'giay-bong-da' },
    { id: 3, name: 'Phụ kiện', slug: 'phu-kien' },
];

@Injectable()
export class CategoryService {
    private categories: Category[] = MOCK_CATEGORIES;
    private nextId: number = 4;

    findAll(): Category[] {
        return this.categories;
    }
    
    findOne(id: number): Category {
        const category = this.categories.find(c => c.id === id);
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found.`);
        }
        return category;
    }

    create(createCategoryDto: CreateCategoryDto): Category {
        const newCategory: Category = {
            id: this.nextId++,
            name: createCategoryDto.name,
            slug: createCategoryDto.name.toLowerCase().replace(/\s/g, '-'),
        };
        this.categories.push(newCategory);
        return newCategory;
    }
    
    update(id: number, updateCategoryDto: UpdateCategoryDto): Category {
        let categoryIndex = this.categories.findIndex(c => c.id === id);
        
        if (categoryIndex === -1) {
            throw new NotFoundException(`Category with ID ${id} not found.`);
        }
        
        const updatedCategory: Category = {
            ...this.categories[categoryIndex],
            name: updateCategoryDto.name || this.categories[categoryIndex].name,
            slug: (updateCategoryDto.name ? updateCategoryDto.name.toLowerCase().replace(/\s/g, '-') : this.categories[categoryIndex].slug),
        };

        this.categories[categoryIndex] = updatedCategory;
        return updatedCategory;
    }
    
    remove(id: number): { message: string } {
        const initialLength = this.categories.length;
        this.categories = this.categories.filter(c => c.id !== id);
        
        if (this.categories.length === initialLength) {
            throw new NotFoundException(`Category with ID ${id} not found.`);
        }
        
        return { message: `Category with ID ${id} successfully removed.` };
    }
}